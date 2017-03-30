/**
 *
 * hkv adapter - Heikostenverteiler
 * 
 * the adapter creates counter objects for each radiator, which has to be set periodically via vis
 * statistics can be done afterwards
 * 
 */

/* jshint -W097 */// jshint strict:false
/*jslint node: true */
"use strict";

// you have to require the utils module and call adapter function
var utils =    require(__dirname + '/lib/utils'); // Get common adapter utils

// you have to call the adapter function and pass a options object
// name has to be set and has to be equal to adapters folder name and main file name excluding extension
// adapter will be restarted automatically every time as the configuration changed, e.g system.adapter.hkv.0
var adapter = utils.adapter('hkv');

// is called when adapter shuts down - callback has to be called under any circumstances!
adapter.on('unload', function (callback) {
    try {
        adapter.log.info('cleaned everything up...');
        callback();
    } catch (e) {
        callback();
    }
});

// is called if a subscribed object changes
adapter.on('objectChange', function (id, obj) {
    // Warning, obj can be null if it was deleted
    adapter.log.info('objectChange ' + id + ' ' + JSON.stringify(obj));
});

function getConfigObjects(Obj, where, what){
    var foundObjects = [];
    for (var prop in Obj){
        if (Obj[prop][where] == what){
            foundObjects.push(Obj[prop]);
        }
    }
    return foundObjects;
}

// is called if a subscribed state changes
adapter.on('stateChange', function (id, state) {
    // Warning, state can be null if it was deleted
    adapter.log.info('stateChange ' + id + ' ' + JSON.stringify(state));

    // you can use the ack flag to detect if it is status (true) or command (false)
    if (state && !state.ack) {
        adapter.log.info('ack is not set!');
        var tmp = id.split('.');
        var dp = tmp.pop(); //should be always countRaw
        var idx = tmp.pop(); //is the name after hkv.x.
        var idy = idx.replace(/radiator_/g,''); //Thermostat
        adapter.log.info('new value hkv sensor : ' + idy + ' ' + state.val);
        var array=getConfigObjects(adapter.config.radiators, 'rid', idy);
        adapter.setState('radiator_' + idy + '.countNorm', {val: state.val * array[0].rfactor, ack: true}, function(err){
                       if(err) {adapter.log.error(err);}
        });
    }
});

// Some message was sent to adapter instance over message box. Used by email, pushover, text2speech, ...
adapter.on('message', function (obj) {
    if (typeof obj == 'object' && obj.message) {
        if (obj.command == 'send') {
            // e.g. send email or pushover or whatever
            console.log('send command');

            // Send response in callback if required
            if (obj.callback) adapter.sendTo(obj.from, obj.command, 'Message received', obj.callback);
        }
    }
});

// is called when databases are connected and adapter received configuration.
// start here!
adapter.on('ready', function () {
    main();
});

function defineRadiator(id){
    adapter.setObject('radiator_' + id, {
        type: 'channel',
        common: {
            name: 'radiator ' + id,
            role: 'sensor'
        },
        native: {
            "addr": id
        }
    });
    adapter.log.info('hkv setting up object = radiator_' + id);

    adapter.setObject('radiator_' + id + '.countRaw', {
        type: 'state',
        common: {
            "name": "Counter raw value",
            "type": "number",
            "read": true,
            "write": true,
            "role": "level",
            "desc": "Counter raw value"
        },
        native: {}
    });

    adapter.setObject('radiator_' + id + '.countNorm', {
        type: 'state',
        common: {
            "name": "Counter calc value ",
            "type": "number",
            "read": true,
            "write": true,
            "role": "level",
            "desc": "Counter calculated value"
        },
        native: {}
    });
}


function main() {

    var obj = adapter.config.radiators;
    for (var anz in obj){
            defineRadiator(obj[anz].rid);
    }
    // in this hkv all states changes inside the adapters namespace are subscribed
    adapter.subscribeStates('*');

}
