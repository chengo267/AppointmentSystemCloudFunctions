

const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

const db = admin.firestore();
var request = require('request');

getWaitingList = (docId) =>{
    const refWaitingList = db.collection('WaitingList');
    const list = [];
      refWaitingList.onSnapshot(querySnapshot =>{
        querySnapshot.forEach(doc =>{
            const {doctorId}=doc.data();
            if(doctorId===docId){
                const {time, token}=doc.data();
                list.push({time: time, token:token});
            }
        });

        //sort by arrival time
        list.sort((a,b)=>{
            var dateA = new Date(a.time);
            var dateB = new Date(b.time);
            return dateA - dateB;});
        
    });
    return list;
};

exports.createWaiting = functions.firestore
    .document('WaitingList/{patientId}')
    .onCreate((snap, context) => {
        console.log("oncreate1");
      const newWaiting = snap.data();
      console.log("on create2", newWaiting.patientName);
      const doctorId = newWaiting.doctorId;
      console.log("on create3 doc avail");
    db.collection('Doctors').doc(doctorId).get()
    .then(doc=> {const {waitingCounter} = doc.data();
                if(waitingCounter===1){
                    console.log("on create4 doc avail");
                    request.post({
                        headers: {'content-type' : 'application/jso'},
                        url:     'https://exp.host/--/api/v2/push/send',
                        body:    {"to":newWaiting.token,
                                  "title": "BOOK A DOCTOR",
                                  "body": "Your turn is now"}
                      }, function(error, response, body){
                        console.log(body);
                      });
                    return 1;
                }else{
                    return 1;
                }})
    .catch(error=> console.log('Get Data Error'));
      return 1;
    });

exports.deleteWaiting = functions.firestore
    .document('WaitingList/{patientId}')
    .onDelete((snap, context) => {
      const deletedWating = snap.data();
      console.log("your deleted", newWaiting.patientName);
      var doctorId = deletedWating.doctorId;
      var waitingList = getWaitingList(doctorId);
      console.log(waitingList);
      if(waitingList !== null){
          var firstInList= waitingList[0];
          var dateDelited = new Date(deletedWating.time);
          var dateFirst = new Date(firstInList.time);
          if(dateFirst > dateDelited){
            request.post({
                headers: {'content-type' : 'application/jso'},
                url:     'https://exp.host/--/api/v2/push/send',
                body:    {"to":firstInList.token,
                          "title": "BOOK A DOCTOR",
                          "body": "Your turn is now"}
              }, function(error, response, body){
                console.log(body);
              });
          }
      }
      return 1;

    });