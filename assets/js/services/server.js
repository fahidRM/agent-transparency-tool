/**
 * @author: Fahid RM
 *
 * @name: Server Factory
 * @desc: A server implementation that allows
 *        the tool to listen on a port for
 *         logs from MAS
 */

angular.module('app.server', [])
    .factory(
        'Server',
        [
            function () {

                const app = require('express')();               // required for server functionality...
                const bodyParser = require('body-parser');      // required for parsing JSON payloads...
                const http = require('http').createServer(app); // required for server functionality...


                let hasBeenSetup =  false;  // setup status
                let isRunning = false;      // running status
                let port = 3700;            // port to listen on



                /**
                 * getStatus
                 * checks if the server is running
                 *
                 * @returns {boolean}: server status: true if server is running and false otherwise
                 */
                function getStatus () {
                    return isRunning;
                }

                /**
                 * setPort
                 * Sets the port to listen on
                 *
                 * @param newPortValue  new port value to use
                 */
                function setPort (newPortValue) {
                    port = newPortValue;
                }

                /**
                 * SetupRestApi
                 * Sets up the REST API for client apps (loggers) to interact with.
                 *
                 * @param onLogReceived    Callback method for received logs
                 */
                function setupRestApi (onLogReceived) {
                    if (hasBeenSetup) { return; }
                    app.use(bodyParser.urlencoded())
                    app.use(bodyParser.json())
                    app.post('/log', (req, res) => {
                        // inform client that request has been received
                        res.send();
                        let payload =  req.body.log || req.body.msg || {};
                        onLogReceived(payload);
                    });
                    hasBeenSetup = true;
                }

                /**
                 * start
                 * Starts the server...
                 */
                function start() {
                    http.listen(port, () => {
                        console.log("Listening on " + port + "...");
                        isRunning = true;
                    });
                }

                /**
                 * stop
                 *
                 * Stops the server...
                 */
                function stop() {
                    http.close();
                    isRunning = false;
                }


                // service API
                return {
                    isRunning: getStatus,
                    setPort: setPort,
                    setup: setupRestApi,
                    start: start,
                    stop: stop
                }

            }
        ]
    );