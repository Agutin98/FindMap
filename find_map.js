'use strict';

// Define module
module.exports = (helper) => {

  /**
   * Find
   *
   * @param {Object} params - Parameters
   * @param {Object} model - Model
   * @return {Promise}
   */
  return (params, model) => {
    return new Promise((resolve, reject) => {
      try {

        let coordinates = [];
        let maxDistance;
        let itemsPerPage = helper.settings.database.itemsPerPage;
        let page = 0;

        if (params.page && params.page > 0) {
          page = parseInt(params.page) - 1;
        } else {
          itemsPerPage = 0;
        }

        if (params.query.coordinates){
          coordinates = params.query.coordinates;
          coordinates = {latitude: coordinates[0], longitude: coordinates[1]};
          delete params.query.coordinates;
        }
        if (params.query.maxDistance){
          maxDistance = params.query.maxDistance;
          delete params.query.maxDistance;
        }

        model
          .find(params.query || {}, params.projection || [])
          .lean()
          .select(params.select || {})
          .populate(params.populates || [])
          .sort(params.sort || {})
          .limit(itemsPerPage)
          .skip(itemsPerPage * page)
          .then(async (data) => {
            const count = await model.count(params.query);
            const result = {
              data: data,
              count: count,
              page: page + 1,
              pages: itemsPerPage == 0 ? 1 : Math.ceil(count / itemsPerPage),
              itemsPerPage: itemsPerPage == 0 ? count : itemsPerPage
            };

            result.data.forEach(service => {
              if (service.lendings){
                service.lendings.forEach(lending => {
                  
                    let lendingCoordinates = lending.address.location.coordinates;
                    let lendingPoint = { latitude: lendingCoordinates[0], longitude: lendingCoordinates[1] };
                    let distanceToUser = helper.lib.geolib.getDistance(coordinates, lendingPoint, 1);
                    lending['distanceToUser'] = Math.floor(distanceToUser / 1000);

                    if (!helper.lib.geolib.isPointWithinRadius(lendingPoint, coordinates, maxDistance)){
                      service.lendings = service.lendings.filter(lend => lend == lending);
                    } 
                });
              };
            });
            resolve(result);
          })
          .catch(error => {
            console.log(error);
            reject(helper.lib.dbError(error.code || -1000, error.message || 'Ocurrio un error inesperado'));
          });

      } catch (error) {
        console.error('Helper "databaseUtils.find" response error');
        reject(error);
      }
    });
  };
};
