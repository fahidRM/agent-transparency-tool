angular.module('app.belief_browser', [])
    .controller(
        'BeliefBrowserController',
        [
            '$scope',
            function ($scope) {
                // list of recognised knowledge types....
                const recognisedTypes = ["belief", "message", "norm", "percept", "sensor", "value"];
                var vm = this;
                vm.searchString = "";

                vm.beliefs = [

                ];
                vm.filteredBeliefs = vm.beliefs;

                /**
                 * getIcon:
                 * Identifies the icon for the associated belief
                 *
                 * @param belief                Belief
                 * @returns {*|string|string}   Icon Name
                 */
                vm.getIcon = function(belief) {
                    const iconName = recognisedTypes.includes(belief.type) ? belief.type : "unknown";
                    return belief.isDeleted === undefined ?
                           iconName : iconName + "_deleted";
                }

                /**
                 *
                 */
                vm.search = function () {
                    if (vm.searchString.length == 0) {
                        vm.filteredBeliefs =  vm.beliefs;
                    } else {
                        vm.filteredBeliefs = _.filter(
                                vm.beliefs,
                                function (belief) {
                                    return belief.value.startsWith(vm.searchString);
                                }
                            );
                    }
                }

                /**
                 *
                 */
                $scope.$on('belief-base-updated', function (event, update) {
                    console.log(update);
                   vm.beliefs =  update;
                   vm.search();
                });
            }
        ]
    )