angular.module('app.sidebar', [])
    .controller(
        'SidebarController',
        [
            '$scope',
            function ($scope) {

                let vm =  this;
                vm.allSchema = {};
                vm.selection = null;


                function onNewSchemaAvailable (type, schema) {
                    vm.allSchema[type] =  { schema: schema, viewPref: {}};
                }

                function onSchemaViewPreferenceSaved (type, viewPreference) {
                    vm.allSchema[type].viewPref = viewPreference;
                    // TODO: alert via broadcast....
                }











            }
        ]
    );