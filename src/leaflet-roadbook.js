/**
 * Created by WangMing on 15/12/24.
 */
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['leaflet'], factory);
  } else if (typeof module === 'object' && module.exports) {
    // Node. Does not work with strict CommonJS, but
    // only CommonJS-like environments that support module.exports,
    // like Node.
    module.exports = factory(require('leaflet'));
  } else if (typeof root !== 'undefined' && root.L) {
    // Browser globals (root is window)
    root.L.roadbook = factory(L);
  }
}(this, function (L) {
  L.Roadbook = L.GeoJSON.extend({
    marker: null,
    toolTip: null,
    index: 0,
    tempPoint: null,
    innerIndex: 0,
    innerStart: null,
    innerEnd: null,
    innerP: null,
    innerLen: 0,
    slopLat: 0,
    slopLng: 0,
    start: null,
    angle: 0,
    end: null,
    timer: null,
    playing: false,
    clear: function () {
      this.stop();
      try {
        map.removeLayer(this.toolTip);
      } catch (e) {
        this.toolTip = null;
      }
      try {
        map.removeLayer(this.marker);
      } catch (e) {
        this.marker = null;
      }
    },
    getTruckUrl: function (a, b) {
      var x = Math.sqrt((a.lat - b.lat) * (a.lat - b.lat));
      var z = Math.sqrt((a.lat - b.lat) * (a.lat - b.lat) + (a.lng - b.lng) * (a.lng - b.lng));
      if (z > 0) {
        var deg = Math.asin(x / z) * 180 / Math.PI;
        if (b.lat >= a.lat && b.lng >= a.lng) {
          this.angle = deg;
        } else if (b.lat >= a.lat && b.lng <= a.lng) {
          this.angle = 180 - deg;
        } else if (b.lat <= a.lat && b.lng <= a.lng) {
          this.angle = deg - 180;
        } else {
          this.angle = 0 - deg;
        }
        return "images/truck" + Math.round(this.angle / 30) * 30 + ".png"
      } else {
        this.angle = null;
        return "images/truck0.png";
      }
      return "images/truck0.png";
    },
    init: function () {
      this.index = 0;
      this.start = $scope.gpsList[this.index];
      this.end = $scope.gpsList[this.index + 1];
      var points = [];
      for (var i = 0; i < $scope.gpsList.length; i++) {
        var p = $scope.gpsList[i];
        points.push({
          type: "Feature",
          properties: point,
          geometry: {
            type: "Point",
            coordinates: [p.lng, p.lat]
          }
        });
      }
      map.fitBounds(new L.geoJson(points).getBounds());
    },
    play: function () {
      this.clear();
      this.init();
      this.tempPoint = [this.start.lat, this.start.lng];
      var html = '<div class="double-bounce1"></div><div class="double-bounce2"></div>';
      //var url = "images/truck0.png";
      var icon = L.icon({
        iconSize: [27, 27],
        iconAnchor: [13, 13],
        popupAnchor: [1, -24],
        iconUrl: this.getTruckUrl(this.start, this.end)
      });
      this.marker = L.marker(this.tempPoint, {icon: icon}).addTo(map);
      this.makeItShow();
      var time = (this.start.curtime && this.start.curtime.length > 19) ? "<p>时间：" + this.start.curtime.substr(0, 19) + "</p>" : "";
      var addr = (this.start.area && this.start.area.length > 0) ? "<p>时间：" + this.start.area + "</p>" : "";
      var html = "<div>" + time + addr + "</div>";
      this.toolTip = L.marker(this.tempPoint, {
        icon: new L.DivIcon({
          iconSize: null,
          className: 'greenLable',
          html: html
        })
      }).addTo(map);
      var self = this;
      self.scop = $scope;
      self.playing = true;
      setTimeout(function () {
        self.animateOnData(self);
      }, 50);
    },
    animateOnData: function (self) {
      //map.removeLayer(this.marker);
      //console.log(this.tempPoint[0] +';'+ this.tempPoint[1]);
      if (self.index == self.scop.gpsList.length) {
        $scope.playStatus = "轨迹回放";
        self.playing = false;
        return;
      }
      if (!self.playing) {
        return;
      }
      $scope.playSec = (self.index + 1) + "/" + self.scop.gpsList.length;
      byId("secSpan").innerHTML = (self.index + 1) + "/" + self.scop.gpsList.length;
      self.start = $scope.gpsList[self.index];
      self.end = $scope.gpsList[self.index + 1];
      $scope.currentPoint = self.start;
      var time = (self.start.curtime && self.start.curtime.length > 19) ? "<p>时间：" + self.start.curtime.substr(0, 19) + "</p>" : "";
      var addr = (self.start.area && self.start.area.length > 0) ? "<p>地址：" + self.start.area + "</p>" : "";
      var html = "<div>" + time + addr + "</div>";
      byId("posSpan").innerHTML = (self.start.area && self.start.area.length > 19) ? self.start.area : "";
      byId("timeSpan").innerHTML = (self.start.curtime && self.start.curtime.length > 19) ? self.start.curtime : "";
      self.toolTip.setLatLng([self.start.lat, self.start.lng]);
      self.toolTip.setIcon(new L.DivIcon({
        iconSize: null,
        className: 'greenLable',
        html: html
      }));
      if (self.index < $scope.gpsList.length - 1 && getDistance(self.start.lat, self.start.lng, self.end.lat, self.end.lng) > 60) {
        var dis = getDistance(self.start.lat, self.start.lng, self.end.lat, self.end.lng);
        self.start = $scope.gpsList[self.index];
        self.end = $scope.gpsList[self.index + 1];
        self.slopLat = (self.end.lat - self.start.lat) / (dis / 60);
        self.slopLng = (self.end.lng - self.start.lng) / (dis / 60);
        self.innerIndex = 0;
        self.innerLen = parseInt(dis / 60);
        self.innerP = [self.start.lat, self.start.lng];
        var icon = L.icon({
          iconSize: [27, 27],
          iconAnchor: [13, 13],
          popupAnchor: [1, -24],
          iconUrl: this.getTruckUrl(self.start, self.end)
        });
        self.marker.setIcon(icon);
        self.makeItShow();
        self.timer = setInterval(function () {
          self.innerAnimate(self);
        }, 50);
      } else if (self.index < $scope.gpsList.length - 1 && getDistance(self.start.lat, self.start.lng, self.end.lat, self.end.lng) < 1) {
        self.index++;
        self.animateOnData(self);
      } else if (self.index < $scope.gpsList.length) {
        self.tempPoint = [self.start.lat, self.start.lng];
        self.marker.setLatLng(self.tempPoint);
        self.makeItShow();
        if (self.index < $scope.gpsList.length - 1) {
          var icon = L.icon({
            iconSize: [27, 27],
            iconAnchor: [13, 13],
            popupAnchor: [1, -24],
            iconUrl: self.getTruckUrl(self.start, self.end)
          });
          self.marker.setIcon(icon);
        }
        self.index++;
        setTimeout(function () {
          self.animateOnData(self);
        }, 100);
      } else {
        //self.tempPoint =  [self.start.lat,self.start.lng];
        //self.marker.setLatLng(self.tempPoint);
        self.index = 0;
        setTimeout(function () {
          self.animateOnData(self);
        }, 100);
      }
    },
    makeItShow: function () {
      if (!map.getBounds().contains(this.marker._latlng)) {
        map.panTo(this.marker._latlng);
      }
    },
    innerAnimate: function (self) {
      if (self.innerIndex <= self.innerLen) {
        self.innerP = [self.innerP[0] + self.slopLat, self.innerP[1] + self.slopLng];
        self.marker.setLatLng(self.innerP);
        self.makeItShow();
        self.innerIndex++;
      } else {
        clearTimeout(self.timer);
        self.index++;
        setTimeout(function () {
          self.animateOnData(self);
        }, 100);
      }
    },
    stop: function () {
      //this.index  = 0;
      //try                                                                                                                                                                                                         {
      //    map.removeLayer(this.marker);
      //}catch(e){}
      //   this.marker = null;
      if (this.timer) {
        clearInterval(this.timer);
      }
      this.playing = false;
    },
    animateTo: function (type) {
      if (type == "add" && this.index < $scope.gpsList.length - 1) {
        this.index++;
      } else if (type == "decrease" && this.index > 0) {
        this.index--;
      }
      this.start = $scope.gpsList[this.index];

      $scope.playSec = (this.index + 1) + "/" + $scope.gpsList.length;
      $scope.currentPoint = this.start;
      this.marker.setLatLng([this.start.lat, this.start.lng]);
      if (this.index < $scope.gpsList.length - 1) {
        this.end = $scope.gpsList[this.index + 1];
        var icon = L.icon({
          iconSize: [27, 27],
          iconAnchor: [13, 13],
          popupAnchor: [1, -24],
          iconUrl: this.getTruckUrl(this.start, this.end)
        });
        this.marker.setIcon(icon);
      }
      this.makeItShow();
      var time = (this.start.curtime && this.start.curtime.length > 19) ? "<p>时间：" + this.start.curtime.substr(0, 19) + "</p>" : "";
      var addr = (this.start.area && this.start.area.length > 0) ? "<p>时间：" + this.start.area + "</p>" : "";
      var html = "<div>" + time + addr + "</div>";
      this.toolTip.setLatLng([this.start.lat, this.start.lng]);
      this.toolTip.setIcon(new L.DivIcon({
        iconSize: null,
        className: 'greenLable',
        html: html
      }));
    }
  });
  L.roadbook = function () {
    return new L.Roadbook();
  };
  return L.echartsLayer;
}));