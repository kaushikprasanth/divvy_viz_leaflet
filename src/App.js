import React from 'react';
import './App.css';
import * as L from 'leaflet'
import 'leaflet.motion/dist/leaflet.motion.js'
import 'leaflet/dist/leaflet.css'
import 'antd/dist/antd.css';
import { Row, Col, DatePicker, Button, Layout } from 'antd'
import moment from 'moment'

import Clock from './Component/Analog_Clock';

import _ from 'lodash';

// const data_divvy = require('./data/data.json');
const station_data = require('./data/station_data.json');
const routes = require('./data/routes.json');
const { RangePicker } = DatePicker;

const { Header, Footer, Sider, Content } = Layout;



class App extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      time: moment('01/01/2020 00:00'),
      refreshDate: moment(moment('01/01/2020 00:00', 'MM/DD/YYYY').endOf("week").second(0).millisecond(0)),
      seqGroup: [],
      pause: false,
      map: '',
      speed: 1000,
      pickup: {},
      data_divvy: [],
      count: 0
    }
  }

  Simulate(date, map, speed) {
    var data = this.state.data_divvy[date] ? this.state.data_divvy[date] : []
    // console.log(new Date(date).toISOString(),date, this.state.data_divvy[date])
    var self = this
    //Changing to ms from epoch Date
    var refreshDate = this.state.refreshDate + 0
    var map = this.state.map
    var speed = this.state.speed
    var startDate = this.state.time
    if (date == refreshDate) {
      refreshDate = moment(refreshDate).add(1, 'minutes')
      startDate += 60000
      // console.log('Inside', new Date(startDate).toISOString())

      this.setState({ time: startDate })

      clearInterval(self.interval)

      fetch('http://localhost:8081/data_' + refreshDate + '.json')
        .then((response) => response.json())
        .then((findresponse) => {
          // console.log(findresponse)

          self.setState({
            data_divvy: findresponse
          })
          refreshDate = moment(refreshDate).endOf('week')
          self.setState({ refreshDate })

        }).catch((err) => {
          console.log(err)
        })

      this.interval = setInterval(function () {
        self.Simulate(startDate, map, speed)
        self.setState({ time: startDate })
        startDate += 60000
      }, speed)

    }
    // console.log(Object.keys(this.state.data_divvy)[0])
    var traffic = []
    var style = ""
    var from = this.state.pickup;
    if (data != undefined)
      data.map(e => {
        var route = []

        try {
          var start = station_data.filter(s => e.from_station_id == s.station_id)
          if (from[start[0].station_id] != undefined)
            from[start[0].station_id] += 1
          else
            from[start[0].station_id] = 1

          var end = station_data.filter(s => e.to_station_id == s.station_id)

          if (routes[e.from_station_id + "-" + e.to_station_id] != undefined)
            routes[e.from_station_id + "-" + e.to_station_id].map(e =>
              route.push({ "lng": +e[0], "lat": e[1] })
            )
          else if (routes[e.to_station_id + "-" + e.from_station_id] != undefined) {
            routes[e.to_station_id + "-" + e.from_station_id].reverse().map(e =>
              route.push({ "lng": +e[0], "lat": e[1] })
            )
          }
          else {
            if (e.to_station_id != e.from_station_id) console.log(e.to_station_id + "-" + e.from_station_id)
            route.push({ "lat": start[0].lat, "lng": start[0].lon })
            route.push({ "lat": end[0].lat, "lng": end[0].lon })
          }
          var lat_diff = start[0].lat - end[0].lat
          var lon_diff = start[0].lon - end[0].lon

          // if (lat_diff < lon_diff) {
          if (lon_diff > 0)
            style = "style='transform: rotateY(180deg)'"
          // }

          if (e.tripduration == undefined)
            e.tripduration = (new Date(e.end_time).getTime() - new Date(e.start_time).getTime()) / 1000
          var motion = L.motion.polyline(route,
            {
              color: "green", weight: 0.5, opacity: 0.5
            }, {
            // easing: L.Motion.Ease.easeInOutQuad
          }, {
            removeOnEnd: true,
            icon: L.divIcon({
              html: "<div class='tooltip'><i class='lni lni-bi-cycle' aria-hidden='true'" + style + "></i>" +
                "<span class='tooltiptext'>" + start[0].name + " -" + end[0].name + "<br>"
                + new Date(e.start_time).toLocaleTimeString('en-US') + " -  " + new Date(e.end_time).toLocaleTimeString('en-US')
                + "</span> </div>", iconSize: L.point(27.5, 24)
            })
          }).motionDuration((Number(e.tripduration) / 60) * speed)
                    function markerOnClick(lon,lat,map)
                    {
                      L.marker([lon,lat]).addTo(map)
                      
          // alert("hi. you clicked the marker at " + e.latlng);
                    }
                    motion.getMarker().on('click', ()=>markerOnClick( start[0].lon ,start[0].lat,map))

          traffic.push(motion)
        }
        catch (error) {
          // console.log(e)
          console.log(error)
        }
      })
    var count = this.state.count;
    count += data.length
    var seqGroup = L.motion.group(traffic).addTo(map)
    this.setState({ pickup: from, count: count })
    seqGroup.motionStart();


    var seqGroup_state = this.state.seqGroup
    // console.log(seqGroup_state.length)
    seqGroup_state = seqGroup_state.slice(-3800)
    seqGroup_state.push(seqGroup)
    this.setState({ seqGroup: seqGroup_state })

  }
  changeSpeed() {
    var self = this
    var speed = (this.state.speed / 10 < 1) ? 1000 : (this.state.speed / 10)
    if (this.state.pause) {
      var seq_state = this.state.seqGroup;
      seq_state.map(e => e.motionStop())
      return this.setState({ speed: speed })
    }

    if (this.state.play) {
    clearInterval(this.interval)
    // var seq_state = this.state.seqGroup;
    // seq_state.map(e => e.motionResume())
    // console.log(this.state.time)
    var seq_state = this.state.seqGroup;
    var startDate = this.state.time
    var map = this.state.map
    this.interval = setInterval(function () {
      self.Simulate(startDate, map, speed)
      self.setState({ time: startDate })
      startDate += 60000
    }, speed)
  }
    this.setState({ speed: speed })
  }
  pauseSeq() {
    var self = this
    if (!this.state.pause) {

      // console.log('pause Called')
      var seq_state = this.state.seqGroup;
      seq_state.map(e => e.motionPause())
      this.setState({ pause: true })
      clearInterval(this.interval)
    }
    else {

      var seq_state = this.state.seqGroup;
      seq_state.map(e => e.motionResume())
      var speed = this.state.speed
      // console.log(this.state.time)
      var startDate = this.state.time
      var map = this.state.map
      this.interval = setInterval(function () {
        self.Simulate(startDate, map, speed)
        self.setState({ time: startDate })
        startDate += 60000
      }, speed)
      this.setState({ pause: false })
    }

  }
  startSim() {
    if(this.state.play)
    {
      
      this.setState({play:false,seqGroup:[],pause:false})
      return clearInterval(this.interval)

    }

    var startDate = this.state.time+0
    fetch('http://localhost:8081/data_' + moment(startDate).startOf('week') + '.json', {
      mode: 'cors', // no-cors, *cors, same-origin
    })
      .then((response) => response.json())
      .then((findresponse) => {

        self.setState({
          data_divvy: findresponse
        })
      }).catch((err) => {
        console.log(err)
      })

    var self = this
    var map = this.state.map
    this.interval = setInterval(function () {
     
      self.Simulate(startDate, map, self.state.speed)
      if(startDate != self.state.refreshDate+0)
      {
        self.setState({ time: startDate })
      startDate += 60000
    }
    }, this.state.speed)
    this.setState({play:true})
  }
  componentDidMount() {
    var self = this
 
    var mapsPlaceholder = [];

    L.Map.addInitHook(function () {
      mapsPlaceholder.push(this); // Use whatever global scope variable you like.
    });

    // var map = L.map('mapid').setView([41.881832, -87.623177], 13);
    // "Other script", can be in its own separate <script> and JS file.
    L.map('mapid').setView([41.881832, -87.603177], 12); // The map object is pushed into `mapsPlaceholder` array.

    // Then retrieve the map object to further manipulate the map.
    var map = mapsPlaceholder.pop();
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // var marker = L.marker([41.881832, -87.623177]).addTo(map);
    // delete L.Icon.Default.prototype._getIconUrl;
    // L.Icon.Default.mergeOptions({
    //   iconRetinaUrl: "https://img.icons8.com/material-sharp/24/000000/cloud-network.png",
    //   iconUrl: "https://img.icons8.com/material-sharp/24/000000/cloud-network.png",
    //   // shadowUrl: require("leaflet/dist/images/marker-shadow.png")
    // });
    // station_data.map(e =>
    //   L.marker([e.lat, e.lon]).addTo(map)
    // )
    this.setState({ map: map })

  }
  render() {
    // console.log("Routes Len ",Object.keys(routes).length)
    var pickup = this.state.pickup
    var keysSorted = Object.keys(pickup).sort(function (a, b) { return pickup[a] - pickup[b] })
    return (
      <Layout>
        <Header style={{height:60}}>
        <h2 style={{color:"white"}}>Divvy Data Visualization using Leaflet</h2>
      </Header>
        <Content>
          <Col>
            <Row style={{padding:5}}>
              <Col flex={4}>
                <Clock time={this.state.time}></Clock>
              </Col>
              <Col flex={2}>
                <RangePicker
                  onChange={(e) => {
                    console.log(moment(e[0]).valueOf())
                    this.setState({ time: moment(e[0]), refreshDate: moment(e[0]).endOf("week") })
                  }}
                  disabledDate={(d) => d < moment('12/31/2019 23:59')}
                  defaultValue={[moment('01/01/2020', 'DD/MM/YYYY')]}
                  format={'DD/MM/YYYY'}
                /></Col>
              <Col flex={2}>
                <Button onClick={() => {
                  this.startSim()
                }}>{!this.state.play?"Play":"Stop"}</Button>
                <Button disabled={!this.state.play}onClick={() => {
                  this.pauseSeq()
                  // clearInterval(this.interval)
                }}>{this.state.pause ? "Resume" : "Pause"}</Button>
                <Button onClick={() => {
                  this.changeSpeed()
                }}>{(1000 / this.state.speed) + "x"}</Button>
              </Col>
            </Row>
            <Row>
              <Col flex={6}>
                <div style={{ height: 650 }} id="mapid"></div>
              </Col>
              <Col flex={1} style={{ paddingLeft: 20 }}>
                <h3>
                  Top 5 Station where Trips Started
              </h3>
                {
                  keysSorted.slice(-5).reverse().map(e => <h5>
                    {station_data.filter(i => i.station_id == e)[0].name + "- " + pickup[e]}
                  </h5>)

                }
                <h3>
                  No of Trips: {this.state.count}
                </h3>
              </Col>
            </Row>
          </Col></Content>
        <Footer style={{ height: 30, padding: 2.5,textAlign: 'center' }}>
        <Row>
              <Col flex={6}>
          Data from 
      <a href="https://divvy-tripdata.s3.amazonaws.com/index.html" target="_blank"> Divvy</a>
        </Col>
        <Col flex={6}>
          Code at  <a href="https://github.com/kaushikprasanth/divvy_viz_leaflet"  target="_blank">  Github </a>
        </Col>
        </Row></Footer>
      </Layout>

    )
  }
}

export default App;
