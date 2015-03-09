'use strict';

(function(global) {
    // Set up websocket
    var socket = io();
    socket.on('welcome', function(data) {
        alert('socket connected');
        if (data.monitorConnected) {
            updateMonitorState(true);
        } else {
            updateMonitorState(false);
        }
    });
    socket.on('coopStateChanged', function() { 
        console.log('coopStateChanged');
        getLatestState();
    });
    socket.on('monitorConnected', function() {updateMonitorState(true)});
    socket.on('monitorDisconnected', function() {upateMonitorState(false)});
    socket.on('messageConfirmation', function(data){
        alert('message received: ' + data.message);
    });
    // Set up m2x 
    var fakeKey = '122lkjklsalskdfja';
    var m2x = new M2X(fakeKey);
    var m2xConfig;
    var coopState = {
        doorOpen: false,
        temperatureC: 0,
        batteryVoltage: 0
    };
    var Promise = global.Promise;
    var $ = global.$;

    var init = function() {
        retrieveM2XConfig()
            .then(getLatestState);
        $('[data-hook=doorStateToggle]').on('click', function() {
            var action = coopState.doorOpen ? 'close' : 'open';
            socket.emit('doorChangePlease', {action: action});
            global.setTimeout(2000, getLatestState);
        });
    };
    
    var retrieveM2XConfig= function() {
        return Promise.resolve($.getJSON('/m2xConfig'))
            .then(function(res) {
                m2xConfig = res;
            })
            .catch(function(err) {
                alert('Error retrieving m2x endpoints');
            });
    };

    var updateMonitorState = function(state) {
        $('[data-hook=monitorState]').html(state ? 'Connected' : 'Disconnected');
    };

    var getLatestState = function() {
        console.log('getting latest state');
        var promises = m2xConfig.streams.map(function(stream) {
            return new Promise(function (resolve, reject) { 
                return m2x.devices.streamValues(m2xConfig.deviceId, stream.id, {limit:1}, resolve, reject);
            })
                .then(function(latestState) {
                    updateCoopState(stream, latestState);
                })
                .catch(function(err) {
                    alert('error retrieving latest values');
                });
        });

       return Promise.all(promises);
    };

    var updateCoopState = function(stream, state) {
        if (state.values.length) {
            coopState[stream.id] = state.values[0].value;
        } else {
            coopState[stream.id] = 'N/A';
        }
        $('[data-hook=' + stream.id + ']').html(stream.label + ':' + coopState[stream.id]);
    };
    
    global.document.addEventListener('DOMContentLoaded', init);
})(window);
