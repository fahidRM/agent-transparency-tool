/**
 * @author: Fahid RM
 * @name: Visualisation Service
 * @desc: A datastore for the visualisation data received and the graphs produced therefrom.
 *        The architectural choice for this was to ensure we can access the same data from
 *        another instance of our controller (another tab or browser window)
 *
 *        This serves as a central point of access....
 *
 */


angular.module('app.data', [])
    .factory(
        'VisualisationService',
        [
            '$rootScope',
            function ($rootScope) {

                const DEFAULTS = {
                    colours: {
                        failureNode: "#f8c291",
                        traversedNode: "#16a085",
                        traversableNode: "#1abc9c",
                        unTraversableNode: "#e74c3c"
                    },
                    invisibleNode: { IDENTIFIER: "", IS_PADDING_NODE: true },
                    maxTries:  1,
                    rootNode: {IDENTIFIER: "[My Agent]"},
                    states: {
                        action: "ACTION",
                        planNotFound: "PLAN_NOT_FOUND",
                        planSelection: "PLAN_SELECTION",
                        planTrace: "PLAN_TRACE",
                        sense: "SENSE"
                    }
                }

                // default agent state
                const INITIAL_STATE = {
                    agents: {all: []},
                    agentHistory: {
                        activities: DEFAULTS.rootNode,
                        beliefs: {},
                        branch: null,
                        currentNode: null,
                        lastNode: null,
                        removedBeliefs: {},
                        selectedNode: null
                    },
                    history: {},
                }


                let agents = [];
                let history = {...INITIAL_STATE.history};



                function onStateReceived (state, currentAgent, ) {
                    // get rid of incomplete state
                    if (state.TYPE_INFO === undefined) { return; }
                    // identify agent (state
                    const concernedAgent =  state.AGENT;
                    // ensure agent is known and has a history cache...
                    if (vm.history[concernedAgent] === undefined) {
                        vm.history[concernedAgent] = _.cloneDeep(INITIAL_STATE.agentHistory);
                        vm.history[concernedAgent].activities["IDENTIFIER"] = concernedAgent;
                        vm.history[concernedAgent].current = vm.history[concernedAgent].activities;
                        // store agents here....
                        vm.agents.all.push(concernedAgent);
                    }

                    //todo: refactor out
                    // visualise the agent if currently not visualising any agent...
                    // this helps us to ensure we have to do nothing on first launch.
                    if (vm.agents.selected === null) {
                        vm.selectAgent(concernedAgent);
                    }
                    // mutate the object.....
                    state.TYPE_INFO.SEQUENCE_NUMBER =  state.SEQUENCE_NUMBER;
                    state.TYPE_INFO.AGENT = state.AGENT;
                    state.TYPE_INFO.TYPE = state.TYPE;

                    switch (state.TYPE) {
                        case DEFAULTS.states.action:
                            logAction(state);
                            break;
                        case DEFAULTS.states.sense:
                            logSense(state);
                            break;
                        case DEFAULTS.states.planSelection:
                            logPlanSelection(state);
                            break;
                        case DEFAULTS.states.planTrace:
                            logPlanTrace(state);
                            break;
                        case DEFAULTS.states.planNotFound:
                            logPlanNotFound(state);
                            break;
                        default:    // there is nothing to do...
                            return;
                    }

                    // update the visualisation if we are currently looking at
                    // the agent with the state update...
                    if (vm.agents.selected === state.AGENT) {
                        updateChart(state.AGENT);
                    }

                }






                function update(log) {
                    // construct an almost unique ID for the agent
                    const logSource =  log.source.agent + " [" +  log.source.mas + "]";
                    if (! agents.includes(logSource)) {
                        agents.push(logSource);
                        $rootScope.$broadcast('AGENT-DISCOVERED', logSource);
                    }
                }

                function retrieve (agent) {

                }





                // service API
                return {
                    getAgentsList: function () { return agents; },
                    retrieve: retrieve,
                    update: update,

                };

        }]);