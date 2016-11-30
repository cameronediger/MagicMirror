/* global Module */

/* Magic Mirror
 * Module: HelloWorld
 *
 * By Michael Teeuw http://michaelteeuw.nl
 * MIT Licensed.
 */

Module.register("cmeDashboard",{

	// Default module config.
	defaults: {
		text: "Yardsitter: 09:12:32 PM, Garage Door: OPEN",
		animationSpeed: 1000,
		updateInterval: 15 * 1000, // every 15 seconds
	},
	
	// Define required scripts.
	getStyles: function() {
		return ["cmeDashboard.css"];
	},

	start: function() {
		Log.info("Starting module: " + this.name);
		
		this.yardsitterStatus = "";
		this.garageStatus = "";
		this.loaded = false;
		this.scheduleUpdate(2500);
		
		this.updateTimer = null;
	},
	
	// Override dom generator.
	getDom: function() {
		var wrapper = document.createElement("div");
		wrapper.className = "small bright";
		
		var DashboardTable = document.createElement("table");
		var DashboardRow = document.createElement("tr");
		
		var yardsitterWrapper = document.createElement("td");
		yardsitterWrapper.innerHTML = "Yardsitter:";
		yardsitterWrapper.className = "dashboardTitle";
		DashboardRow.appendChild(yardsitterWrapper);
		
		var yardsitterStatusWrap = document.createElement("td");
		//yardsitterStatusWrap.innerHTML = "09:12:32 PM"
		yardsitterStatusWrap.innerHTML = this.yardsitterStatus;
		if(this.yardsitterStatus.indexOf("Zone") >= 0) {
			yardsitterStatusWrap.className = "align-left activeStatus";
		}
		else if(this.yardsitterStatus.indexOf("NOT CONNECTED") >= 0) {
			yardsitterStatusWrap.className = "align-left warnStatus";
		}
		else {
			yardsitterStatusWrap.className = "align-left normalStatus";
		}
		DashboardRow.appendChild(yardsitterStatusWrap);
		
		var garageWrapper = document.createElement("td");
		garageWrapper.innerHTML = "Garage Door:";
		garageWrapper.className = "dashboardTitle";
		DashboardRow.appendChild(garageWrapper);
		
		var garageStatusWrap = document.createElement("td");
		garageStatusWrap.innerHTML = this.garageStatus;
		if(this.garageStatus.indexOf("CLOSED") >= 0) {
			garageStatusWrap.className = "align-left normalStatus";
		}
		else {
			garageStatusWrap.className = "align-left warnStatus";
		}
		DashboardRow.appendChild(garageStatusWrap);
		
		DashboardTable.appendChild(DashboardRow);
		wrapper.appendChild(DashboardTable);
		
		return wrapper;
	},
	
	GetGarageStatus: function() {
		console.log("GetGarageStatus()...");
		var strUrl = "http://blake:8080/rest/items/itm_garage_doorst/state";
		var self = this;

		var retry = true;

		var statusRequest = new XMLHttpRequest();
		statusRequest.open("GET", strUrl, true);
		console.log("  garage status 1");
		statusRequest.onreadystatechange = function() {
			if(this.readyState === 4) {
				if(this.status === 200) {
					console.log(this.response);
					self.garageStatus = this.response;

					self.loaded = true;
					self.updateDom(self.config.animationSpeed);
				}
			}
		};

		statusRequest.send();
	},

	GetDeviceStatus: function () {
		//https://api.particle.io/v1/devices/50ff72065067545617450587/currstatus?access_token=64da087b8204a55fea660ec1813ce19d3527bdad
		
		var strUrl = "https://api.particle.io/v1/devices/50ff72065067545617450587/currstatus?access_token=64da087b8204a55fea660ec1813ce19d3527bdad";
		var self = this;

		var retry = true;

		var statusRequest = new XMLHttpRequest();
		statusRequest.open("GET", strUrl, true);
		statusRequest.onreadystatechange = function() {
			if (this.readyState === 4) {
				if (this.status === 200) {
					try {
						console.log(this.response);
						var parsed = JSON.parse(this.response);
					}catch(e){
						console.log("DeviceStatus - JSON error: " + e.name);
						this.yardsitterStatus = "ERROR";
						self.scheduleUpdate((self.loaded) ? -1 : 2500);
						return;
						// here to prevent freezin of app on unfinished JSON.
					}
					self.processDeviceStatus(parsed);
				} else if (this.status === 401) {
					console.log("401");
					//self.config.appid = "";
					self.updateDom(self.config.animationSpeed);

					//Log.error(self.name + ": Incorrect APPID.");
					retry = false;
				} else {
					console.log("Unknown Error");
					//Log.error(self.name + ": Could not load weather.");
					this.yardsitterStatus = "ERROR";
				}

				if (retry) {
					self.scheduleUpdate((self.loaded) ? -1 : 2500);
				}
			}
		};
		statusRequest.send();
	},
	
	processDeviceStatus: function(data) {

		if(data != null) {
			if(data.result === 0) {		//No zones running
				if(data.coreInfo != null && data.coreInfo.connected === true) {
					var d = new Date(data.coreInfo.last_heard);
					this.yardsitterStatus = d.toLocaleString();
					//this.yardsitterStatus = d.toLocaleFormat("%m-%d-%Y %H:%M:%S");
				}
				else {
					this.yardsitterStatus = "NOT CONNECTED";
				}
			}
			else if((data.result & 0x01) > 0) {
				this.yardsitterStatus = "Zone 1";
			}
			else if((data.result & 0x02) > 0) {
				this.yardsitterStatus = "Zone 2";
			}
			else if((data.result & 0x04) > 0) {
				this.yardsitterStatus = "Zone 3";
			}
			else if((data.result & 0x08) > 0) {
				this.yardsitterStatus = "Zone 4";
			}
			else if((data.result & 0x10) > 0) {
				this.yardsitterStatus = "Zone 5";
			}
			else if((data.result & 0x20) > 0) {
				this.yardsitterStatus = "Zone 6";
			}
			else if((data.result & 0x40) > 0) {
				this.yardsitterStatus = "Zone 7";
			}
			else if((data.result & 0x80) > 0) {
				this.yardsitterStatus = "Zone 8";
			}
		}
		else {
			this.yardsitterStatus = "NOT CONNECTED";
		}

		this.loaded = true;
		this.updateDom(this.config.animationSpeed);
	},
	
	scheduleUpdate: function(delay) {
		console.log("delay: " + delay + ", interval: " + this.config.updateInterval);
		var nextLoad = this.config.updateInterval;
		if (typeof delay !== "undefined" && delay >= 0) {
			nextLoad = delay;
		}

		var self = this;
		clearTimeout(this.updateTimer);
		this.updateTimer = setTimeout(function() {
			self.GetDeviceStatus();
			self.GetGarageStatus();
		}, nextLoad);
	},
});
