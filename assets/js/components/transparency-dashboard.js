
angular.module('app.transparency_dashboard', [])
    .controller(
        'DashboardController',
        [
            '$scope', '$rootScope',  'VisualisationService', 'Server',
            function ($scope, $rootScope, visualisation, server) {

                // default options
                const DEFAULTS = {
                    colours: {
                        failureNode: "#f8c291",
                        traversedNode: "#16a085",
                        traversableNode: "#1abc9c",
                        unTraversableNode: "#e74c3c"
                    },
                    maxTries:  1,
                    rootNode: {payload: { contents: { IDENTIFIER: "[My Agent]"} }},
                }

                // initial states
                const INITIAL_STATE = {
                    agents: {all: [], selected: undefined}
                }


                let vm = this;                           // view model
                vm.agents = { ...INITIAL_STATE.agents};  // known agents
                vm.autoscroll = true;                    // autoscroll status
                vm.serverIsRunning = false;              // debugger status

                /** D3 variables **/
                let diagonal,
                    div,            // container div of the SVG chart
                    duration = 0,   // transition period
                    margin = {top: 20, right: 10, bottom: 20, left: 10},
                    i = 0,
                    root,
                    svg,
                    tree,
                    width =  10000000;


                /**
                 * AGENT-DISCOVERED event listener
                 * listens to the event that an agent has been discovered...
                 *
                 * @param event: {Object} angular-js broadcast event object
                 * @param agent: {String} Name of Discovered agent
                 */
                $rootScope.$on('AGENT-DISCOVERED', function(event, agent) {
                    if (agent === undefined || agent === null) { return; }
                    vm.agents.all.push(agent);
                    if (vm.agents.selected === undefined) {
                        vm.selectAgent(agent);
                    }
                    $scope.$apply();
                });

                $rootScope.$on('AGENT-KB-CHANGED', function(event, changeInfo) {
                    if (changeInfo.agent === vm.agents.selected)
                    {
                        const kbUpdate = visualisation.getAgentKBAt(changeInfo.agent, changeInfo.sequence);
                        console.log(kbUpdate);
                    }
                });

                /**
                 * AGENT-STATE-CHANGED event listener
                 * listens to the event that an agent's state has changed
                 *
                 * @param event: {Object} angular-js broadcast event object.
                 * @param agent: {String} Name of Agent whose state changed.
                 */
                $rootScope.$on('AGENT-STATE-CHANGED', function(event, agent) {
                   // if the state of the agent we have selected changes, we need to visualise it
                   if (vm.agents.selected === agent) {
                       root =  visualisation.getAgentTrace(agent);
                       updateVisualisation(root);
                   }
                });




                /**
                 * vm.initialise
                 * Initialises the tool
                 * ... configures the server and ensures it updates the visualiser
                 * with the logs received.
                 * ... sets up the visualisation board so agent state may be displayed
                 *
                 * @agent {String | optional} Name of agent to set up the visualisation board for (optional parameter)
                 */
                vm.initialise = function (agent) {
                    server.setup(visualisation.onLogReceived);
                    setupVisualisationBoard(agent);
                }

                /**
                 * vm.reset
                 * Resets the tool
                 */
                vm.reset = function () {

                }

                /**
                 * vm.selectAgent
                 * Selects an agent to visualise
                 *
                 * @param agent {String} Name of agent to be visualised
                 */
                vm.selectAgent = function (agent) {
                    vm.agents.selected = agent;
                    // clear what is currently visualised....
                    const vBoard = angular.element(document.querySelector("#visualisation_board"));
                    vBoard.empty();
                    // initialise the visualisation board with the selected agent's data
                    root =  visualisation.getAgentTrace(agent);
                    vm.initialise(agent);
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



                /**
                 * getNodeColour
                 * Inspect a node and decide what colour it should be
                 *
                 * @param node          Visualisation (Graph) node
                 * @returns {string}    Colour as text or hex
                 */
                function getNodeColour (node) {
                    let nodeColour;
                    if (node["FAILURE_REASON"] !== undefined) {
                        nodeColour = DEFAULTS.colours.failureNode;
                    }
                    else if (node.payload.contents.IS_PADDING_NODE !== undefined) { nodeColour = "white"}
                    else if ((node.CONTEXT_PASSED === undefined) || (node.CONTEXT_PASSED)) {
                        nodeColour = DEFAULTS.colours.traversableNode
                    }
                    else {
                        nodeColour =  DEFAULTS.colours.unTraversableNode
                    }
                    return nodeColour;
                }


                function mouseover() {
                    div.transition()
                        .duration(100)
                        .style("opacity", 1);
                }

                function mouseout() {
                    div.transition()
                        .duration(100)
                        .style("opacity", 1e-6);
                }

                function mousemove(d) {
                    //todo: regenerate if view preference changes at runtime
                    if (d.mousemove_html === undefined) {
                        div.text("")
                            .style("left", (d3.event.pageX ) + "px")
                            .style("top", (d3.event.pageY) + "px");

                        div.append("b").text(d.payload.contents.IDENTIFIER);

                        if (d.context_summary !== undefined) {
                            div.append("br")
                            div.append("br")
                            div.append("b").text("context:");
                            d.context_summary.context_info.forEach(function (context) {
                                div.append("br")
                                div.append("span")
                                    .text(context[0])
                                    .style("color",
                                        context[1] ? DEFAULTS.colours.traversableNode
                                            : DEFAULTS.colours.unTraversableNode
                                    );
                            });
                        }
                        d["mousemove_html"] = div.html();
                    } else {
                        div.html(d.mousemove_html);
                        // reposition the tooltip
                        // without this, the tooltip will appear in the wrong location
                        div.style("left", (d3.event.pageX ) + "px")
                            .style("top", (d3.event.pageY) + "px");
                    }
                }

                function selectState (state) {

                }

                /**
                 * setupVisualisationBoard
                 * Sets up the visualisation board (d3 diagram)
                 * @param agent {String | optional} Name of Agent to visualise (optional param)
                 */
                function setupVisualisationBoard(agent) {
                    const height = document.getElementById('view_region').offsetHeight - document.getElementById('view_header').offsetHeight - margin.top - margin.bottom;
                    tree = d3.layout.tree().size([height, width]);
                    diagonal = d3.svg.diagonal().projection(function(d) { return [d.y, d.x]; });
                    svg = d3.select("#visualisation_board").append("svg")
                            .attr("width", width + margin.right + margin.left + 400)
                            .attr("height", height + margin.top + margin.bottom)
                            .append("g")
                            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

                    if (agent === undefined) { root = {...DEFAULTS.rootNode}; }
                    root.x0 = height / 2;
                    root.y0 = 0;
                    updateVisualisation(root);
                }

                /**
                 * update Visualisation
                 * Updates the visualisation being shown on the dashboard
                 *
                 * @param source    {object}   Visualisation source object. i.e. Agent's trace
                 */
                function updateVisualisation (source) {
                    // Compute the new tree layout.
                    if (div === undefined) {
                        div = d3.select("body").append("div")
                            .attr("class", "tooltip")
                            .style("opacity", 1e-6);
                    }

                    let nodes = tree.nodes(root).reverse();
                    let links = tree.links(nodes);

                    links = _.remove(links, function (link) {
                        return (link.target.payload.contents.IS_PADDING_NODE === undefined);
                    });



                    // Normalize for fixed-depth.
                    nodes.forEach(function(d) {
                        d.y = d.depth * 180;
                    });

                    // Update the nodes…
                    let node = svg.selectAll("g.node").data(
                        nodes, function(d) {
                            return d.id || (d.id = ++i);
                        });

                    // Enter any new nodes at the parent's previous position.
                    let nodeEnter = node.enter()
                        .append("g")
                        .attr("class", "node")
                        .attr(
                            "transform",
                            function() {
                                return "translate(" + source.y0 + "," + source.x0 + ")";
                            })
                        .on("click", selectState);

                    nodeEnter.append("svg:circle")
                        .on("mouseover", mouseover)
                        .on("mousemove", function(d){mousemove(d);})
                        .on("mouseout", mouseout)
                        .attr("r", 1e-6)
                        .style(
                            "fill",
                            function(d) {
                                if (d.node_colour === undefined) {
                                    d["node_colour"] = getNodeColour(d);
                                }
                                return d.node_colour;
                            });
                    nodeEnter.append("svg:text")
                        .attr(
                            "x",
                            function(d) {
                                return d.children || d["_children"] ? -13 : 13;
                            })
                        .attr("dy", ".35em")
                        .attr(
                            "text-anchor",
                            function(d) {
                                return d.children || d["_children"] ? "end" : "start";
                            })
                        .text(function(d) {
                            return "\n" + d.payload.contents.IDENTIFIER; })
                        .style("fill-opacity", 1e-6);

                    // Transition nodes to their new position.
                    let nodeUpdate = node.transition()
                        .duration(duration)
                        .attr("transform", function(d) {
                            return "translate(" + d.y + "," + d.x + ")";
                        });
                    nodeUpdate.select("circle")
                        .attr("r", 10)
                        .style("fill", function(d) {
                            return getNodeColour(d);
                        });

                    nodeUpdate.select("text")
                        .style("fill-opacity", 1);

                    // Transition exiting nodes to the parent's new position.
                    let nodeExit = node.exit().transition()
                        .duration(duration)
                        .attr("transform", function() {
                            return "translate(" + source.y + "," + source.x + ")";
                        })
                        .remove();
                    nodeExit.select("circle")
                        .attr("r", 1e-6);

                    nodeExit.select("text")
                        .style("fill-opacity", 1e-6);


                    // Update the links…
                    let link = svg.selectAll("path.link")
                        .data(links, function(d) {
                            if (d.target.payload.contents.IS_PADDING_NODE !== undefined) {
                                return null;
                            } else {
                                return d.target.id;
                            }
                        });


                    // Enter any new links at the parent's previous position.
                    link.enter().insert("path", "g")
                        .attr("class", "link")
                        .attr("d", function() {
                            let o = {x: source.x0, y: source.y0};
                            return diagonal({source: o, target: o});
                        });

                    // Transition links to their new position.
                    link.transition()
                        .duration(duration)
                        .attr("d", diagonal);

                    // Transition exiting nodes to the parent's new position.
                    link.exit().transition()
                        .duration(duration)
                        .attr("d", function() {
                            let o = {x: source.x, y: source.y};
                            return diagonal({source: o, target: o});
                        })
                        .remove();


                    let visualisationBoardContainer = document.getElementById("view_region");
                    let visualisationBoard = document.getElementById("visualisation_board");
                    const visualisationBoardVisibleWidth = visualisationBoardContainer.offsetWidth;
                    let lastNodePosition = 0;

                    nodes.forEach(function(d) {
                        lastNodePosition = lastNodePosition < d.y ? d.y : lastNodePosition;
                        d.x0 = d.x;
                        d.y0 = d.y;
                    });

                    if (vm.autoscroll) {
                        if (lastNodePosition > (0.8 * visualisationBoardVisibleWidth)) {
                            visualisationBoard.scrollLeft = lastNodePosition - (0.8 * visualisationBoardVisibleWidth);
                        }
                    }

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