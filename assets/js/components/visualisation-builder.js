angular.module('app.data', [])
    .factory(
        'VisualisationService',
        [
            function () {

                // default agent state
                const INITIAL_STATE = {
                    agents: {all: [], selected: null},
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




                let graphs = { a: "hello" };
                let history = {...INITIAL_STATE.history};


                function processLog(log) {
                    history.push(log);
                    const logOwner =  log['owner'];
                    graphs[logOwner] =  json.stringify(log);
                }


                return function (request, agent) {
                    if (agent === null) {
                        processLog(request);
                        // todo: process log here....
                    } else {
                        return graphs[agent] || {};
                    }
                };

        }]);