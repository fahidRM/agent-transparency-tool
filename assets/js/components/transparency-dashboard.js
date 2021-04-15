
angular.module('app.transparency_dashboard', [])
    .controller(
        'DashboardController',
        [
            '$scope', '$rootScope',  'VisualisationService', 'Server',
            function ($scope, $rootScope, visualisation, server) {

                const INITIAL_STATE = {
                    agents: {all: [], selected: undefined}
                }


                let vm = this;                           // view model
                vm.agents = { ...INITIAL_STATE.agents};  // known agents
                vm.autoscroll = true;                    // autoscroll status
                vm.serverIsRunning = false;                    // debugger status


                /**
                 * AGENT-DISCOVERED event listener
                 * listens to the event that an agent has been discovered...
                 *
                 * @param agent: The agent's name
                 */
                $rootScope.$on('AGENT-DISCOVERED', function(event, agent) {
                    if (agent === undefined || agent === null) { return; }

                    vm.agents.all.push(agent);
                    if (vm.agents.selected === undefined) {
                        selectAgent(agent);
                    }
                    $scope.$apply();
                });

                /**
                 * vm.initialise
                 * Initialises the tool
                 * ... configures the server and ensures it updates the visualiser
                 * with the logs received
                 */
                vm.initialise = function () {
                    server.setup(visualisation.update);
                }

                vm.reset = function () {

                }

                /**
                 * vm.toggleAutoscroll
                 * Toggles the visualisation's autoscroll feature
                 */
                vm.toggleAutoscroll = function () {
                    vm.autoscroll =  ! vm.autoscroll;
                }

                /**
                 * vm.toggleServer
                 * Toggles the server on/off
                 */
                vm.toggleServer = function() {
                    if (vm.serverIsRunning) {
                        server.stop();
                    } else {
                        vm.initialise();
                        server.start();
                    }
                    vm.serverIsRunning = !vm.serverIsRunning;
                }





                function selectAgent (agent) {
                    console.log("selected: " +  agent);
                    vm.agents.selected = agent;

                    // do other things to start visualising
                }









                /**
                 * todo:
                 * 1. option to set scale-by time (ie. one of the time set there)
                 * 2. actually scale by the variable
                 * 3.
                 *
                 */


            }
        ]
    )