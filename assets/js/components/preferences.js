
angular.module('app.preferences', [])
    .controller('ViewPreferenceController', ['$rootScope', function ($rootScope) {

        let vm =  this;
        vm.logTypes = [
            {
                name: 'ACTION',
                props: [{ name: 'CODE_LINE', visible: true},  { name: 'CODE_FILE', visible: true }]
            },
            {
                name: 'PLAN_TRACE',
                props: [{ name: 'CODE_LINE', visible: true},  { name: 'CODE_FILE', visible: true }]
            }
        ];

        vm.selectedLogType = null;
        vm.updatedViewPreference =  null;
        let selectedIndex =  -1;

        function updateOptions () {
            if (vm.selectedLogType !== null) {
                vm.logTypes[selectedIndex] = {...vm.selectedLogType};
            }
            $rootScope.$broadcast('updated-view-preference',vm.selectedLogType);
            alert("broadcasted");
        }

        vm.setSelectionIndex = function (index) {
            selectedIndex =  index;
        }
        vm.togglePropVisibility = function (index) {
            vm.selectedLogType.props[index].visible = !vm.selectedLogType.props[index].visible;
        }

        vm.onLogTypeSelected =  function (logType) {
                vm.selectedLogType =  logType;
        }



        vm.onViewPreferenceUpdated = function () {
                updateOptions();
        }







    }])


