

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
                list.push({'time': time, 'token':token});
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
        console.log("onCreate called")
        const newWaiting = snap.data();
        const doctorId = newWaiting.doctorId;
        db.collection('Doctors').doc(doctorId).get()
        .then(doc=> {const {waitingCounter} = doc.data();
                    if(waitingCounter===1){
                        request.post({
                            headers: {'content-type' : 'application/json'},
                            url:     'https://exp.host/--/api/v2/push/send',
                            body:    {"to":newWaiting.token,
                                    "title": "BOOK A DOCTOR",
                                    "body": "Your turn is now"},
                            json: true
                        }, function(error, response, body){
                            console.log("push response", body);
                        });
                    }
                    return 1;
                })
        .catch(error=> console.log('Get Data Error'));
        return 1;
    });

exports.deleteWaiting = functions.firestore
    .document('WaitingList/{patientId}')
    .onDelete((snap, context) => {
      const deletedWating = snap.data();
      console.log("you deleted", deletedWating.patientName);
      var doctorId = deletedWating.doctorId;
      var waitingList = getWaitingList(doctorId);
      console.log(waitingList);
      if(waitingList.length > 0){
          var firstInList= waitingList[0];
          var dateFirst = new Date(firstInList.time);
          var dateDeleted = new Date(deletedWating.time);
          console.log("delete log", dateDeleted, dateFirst);
          if(dateFirst > dateDeleted){
            request.post({
                headers: {'content-type' : 'application/json'},
                url:     'https://exp.host/--/api/v2/push/send',
                body:    {"to":firstInList.token,
                          "title": "BOOK A DOCTOR",
                          "body": "Your turn is now"},
                json: true
              }, function(error, response, body){
                console.log(body);
              });
          }
      }
      return 1;

    });