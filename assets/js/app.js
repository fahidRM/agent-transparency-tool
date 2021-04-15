
const singlePageApplication = angular.module("agent-transparency-tool", [
    'app.belief_browser',               // belief base
    'app.data',                         // visualisation module
    'app.preferences',                  // visualisation preference controller
    'app.server',                       // the server (express js server)
    'app.settings',                     // settings controller
    'app.transparency_dashboard',       // the main page controller
]);

