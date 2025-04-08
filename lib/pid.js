/*
 * Copyright (c) 2012 Mathieu Turcotte
 * Licensed under the MIT license.
 */

const fs = require('node:fs');

const actions = {
    /**
     * Check if the PID process is still running
     *
     * @param {String|Number} pid
     * @returns {Boolean}
     */
    isRunning (pid) {
        try {
            return process.kill(pid, 0);
        }
        catch (e) {
            return e.code === 'EPERM';
        }        
    },
    /**
     * Check if PID file exists and is running
     *
     * @param {String} path
     * @returns {Booelan}
     */
    exists (path) {
        let result = false;

        try {
            const st = fs.statSync(path);

            if (st.isFile()) {
                const pid = fs.readFileSync(path, {encoding: 'utf-8'});

                result = this.isRunning(pid);
            }
        } catch (err) {
            result = true;
        }

        return result;
    },
    /**
     * Create a file PID
     *
     * @param {String} path
     * @param {Booelan} force
     */
    create (path, force) {
        const pid = Buffer.from(`${process.pid}\n`);
        const fd = fs.openSync(path, force ? 'w' : 'wx');
        let offset = 0;

        while (offset < pid.length) {
            offset += fs.writeSync(fd, pid, offset, pid.length - offset);
        }

        fs.closeSync(fd);

        return new Pid(path);
    },
    /**
     * Remove the pid file
     *
     * @param {String} path
     * @return {Booelan}
     */
    remove (path) {
        try {
            fs.unlinkSync(path);
            return true;
        } catch (err) {
            return false;
        }
    },
    /**
     * Terminate process linked in pid file
     *
     * @param {String} path
     * @param {String|Number} signal
     */
    terminate (path, signal) {
        const pid = fs.readFileSync(path, {encoding: 'utf-8'});

        return process.kill(pid, signal);
    }
};

/**
 * Pid file handle which can be used to remove the pid file.
 *
 * @param path The pid file's path.
 */
function Pid (path) {
    /** @var {String} path_ */
    this.path_ = path;

    /** Removes the PID file synchronously. Does not throw. */
    this.remove = function () {
        return actions.remove(this.path_);
    };
    
    /** Removes the PID file on normal process exit. */
    this.removeOnExit = function() {
        process.on('exit', this.remove.bind(this));
        process.on('SIGTERM', this.remove.bind(this));
    };
}

module.exports = actions;
