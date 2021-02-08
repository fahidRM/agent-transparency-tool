angular.module('app.settings', [])
    .service('SettingsManager', [function () {

        const settings = require('electron-settings');


        this.createOrUpdate =  function (property, value) {
            let $promise = settings.set(property, value);
            return $promise.then ( () => {
                return true;
            });
        }

        this.delete =  function (property) {
            return this.createOrUpdate(property, {});
        }


        this.get = function (property) {
            let $promise =  settings.get(property);
            return $promise.then( (value) => {
                return value;
            })
        }



    }])
