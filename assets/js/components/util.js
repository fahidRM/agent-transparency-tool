angular.module('app.util', [])
    .service('UtilityService', [function () {


        /**
         * isAValidLog
         * Confirms that a log is valid (i.e: Meets the minimum requirement for the tool)
         *
         * @param log   Log to validate
         * @returns {boolean}   Validity of the log
         */
        function isAValidLog (log) {
            return log !== null && log !== undefined && log.payload !== undefined && log.source !== undefined && log.time !== undefined;
        }






        // service API
        return {
            isAValidLog: isAValidLog
        }
    }
]);