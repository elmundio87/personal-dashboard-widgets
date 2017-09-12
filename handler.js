'use strict';

/* eslint-disable no-param-reassign */

var JiraApi = require('jira-client');
var GitHubApi = require("github");
var Mustache = require("mustache")
var fs = require('fs');

var html = `
  <html>
    <head>
        <script src="https://code.jquery.com/jquery-3.2.1.min.js" integrity="sha256-hwg4gsxgFZhOsEEamdOYGBf13FyQuiTwlAQgxVSNgt4=" crossorigin="anonymous"></script>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/raphael/2.2.7/raphael.min.js"></script>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/justgage/1.2.9/justgage.min.js"></script>
        <style>

            body {
                transition: background 0.5s linear;
                font-family: "-apple-system",BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Helvetica,Ubuntu,Arial,sans-serif,"Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol";
            }

            .inactive {
                background-color: grey;
            }

            .rain {
                background-color: skyblue;
            }

            .normal {
                 background-color: white;
            }

            .warning {
                 background-color: yellow;
            }

            .critical {
                 background-color: red;
            }

            #title {
                font-size: 12pt;
            }

            #value {
                    font-size: 72px;
                    font-weight: 300;
                /*  width: 100px; */
                    height: 100px; 
            }

            #subtitle {
                font-size: 14px;
            }

            #timestamp {
                position: absolute;
                bottom: 0px;
                right: 0px;
                font-size: 5pt;
                color: grey;
            }

        </style>
    </head>
    <body>
        <div class="widget">
            <div id="title">??</div>
            <div id="value">??</div>
            <div id="subtitle">??</div>
        </div>
        <div id="timestamp">??</div>
        <script>

            var dial = new Object

            var refresh = function() {
                callAjax(url, callback);
            }
            
            document.body.addEventListener('click', refresh, true);

            var getParameterByName = function(name) {
                var match = RegExp('[?&]' + name + '=([^&]*)').exec(window.location.search);
                return match && decodeURIComponent(match[1].replace(/\\+/g, ' '));
            }

            var url = window.location.protocol + "//" + window.location.host + "/api/" + getParameterByName("name") + "?&code=" + getParameterByName("code") 
            var callAjax = function(url, callback){
                var xmlhttp;
                // compatible with IE7+, Firefox, Chrome, Opera, Safari
                xmlhttp = new XMLHttpRequest();
                xmlhttp.onreadystatechange = function(){
                    if (xmlhttp.readyState == 4 && xmlhttp.status == 200){
                        callback(xmlhttp.responseText);
                    }
                }
                xmlhttp.open("GET", url, true);
                xmlhttp.send();
            }

            var callback = function(response){
                var data = JSON.parse(response)

                var body = $("body")[0];
                var title = $("#title");
                var timestamp = $("#timestamp");
                var value = $('#value')
                var subtitle = $('#subtitle')
                title.html(data.title);
                timestamp.html(data.timestamp);

                if(data.type == "value"){
                    
                    body.className = data.status;

                    if(value.html() != data.value){
                        $('#value').fadeOut('slow', function() {
                            $('#value').html(data.value);
                            $('#value').fadeIn('slow');
                        });
                    }

                }

                if(data.type == "dial"){

                    if($("#value svg")[0] == null){
                        
                        $("#value").css({
                            "width": "144px",
                            "height": "100px"
                        });
         
                        $("#value").text("")
                        dial = new JustGage({
                            id: "value",
                            value: data.value,
                            min: data.dial.min,
                            max: data.dial.max,
                            hideMinMax: false,
                            valueMinFontSize: "50pt",
                            valueFontFamily: '"-apple-system",BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Helvetica,Ubuntu,Arial,sans-serif,"Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol"'
                        });                     
                    }
                    else{
                        dial.refresh(data.value)
                    }
                    $("#value text")[0].setAttribute("y",85)
                    $("#value text")[0].style.fontWeight = 300
                    $("#value text")[2].setAttribute("y",85)
                    $("#value text")[3].setAttribute("y",85)
                }
                
                if(subtitle.html() != data.subtitle){
                    $('#subtitle').fadeOut('slow', function() {
                        $('#subtitle').html(data.subtitle);
                        $('#subtitle').fadeIn('slow');
                    });
                }

            }

            callAjax(url, callback)
            setInterval(function(){ callAjax(url, callback) }, 300000);

        </script>
    </body>
  </html>
`;

Array.prototype.sum = Array.prototype.sum || function() {
  return this.reduce(function(sum, a) { return sum + Number(a) }, 0);
}

Array.prototype.average = Array.prototype.average || function() {
  return this.sum() / (this.length || 1);
}

var jira_options = {
    protocol: "https",
    host: "devopsguys.atlassian.net", 
    username: "#{jira_username}#", 
    password: "#{jira_password}#",
    apiVersion: '2',
    strictSSL: true
}

var app_config = {
    "pagerdutyAPI": "#{pagerdutyAPI}#",
    "oms_workspace": "#{oms_workspace}#",
    "oms_sharedkey": "#{oms_sharedkey}#",
    "darksky_APIKey": "#{darksky_APIKey}#"
}

var peopleHR_options = {
	"APIKey":"#{peopleHR_APIKey}#",
	"Action": "GetQueryResult",
	"QueryName":"Thanks Badges"
}

var betterworks_options = {
    "APIKey":"#{betterworks_APIKey}#",
    "UserID":"#{betterworks_UserID}#"
}

var azure_config = {
    "azureServicePrincipalClientId": "#{AZURESERVICEPRINCIPALCLIENTID}#",
    "azureServicePrincipalPassword": "#{AZURESERVICEPRINCIPALPASSWORD}#",
    "azureServicePrincipalTenantId": "#{AZURESERVICEPRINCIPALTENANTID}#",
    "azureSubId": "#{AZURESUBID}#"
}


var dateDiffInDays = function(a, b) {
    var _MS_PER_DAY = 1000 * 60 * 60 * 24;
    // Discard the time and time-zone information.
    var utc1 = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
    var utc2 = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());

    return Math.floor((utc2 - utc1) / _MS_PER_DAY);
}


var toDate = function(dateStr, separator) {
    if(typeof separator == "undefined") {separator = "/";}

    var parts = dateStr.split(separator);
    return new Date(parts[2], parts[1] - 1, parts[0]);
}

var toDateYYMMDD = function(dateStr, separator) {
    if(typeof separator == "undefined") {separator = "/";}

    var parts = dateStr.split(separator);
    return new Date(parts[0], parts[1] - 1, parts[2]);
}

var betterworksMilestonesActive = function(result){

    var now = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() )
    var upperRange = toDateYYMMDD(result['end'],'-')
    var lowerRange = toDateYYMMDD(result['start'],'-')
    
    return (now > lowerRange && now <= upperRange)
}

var betterworksMilestonesUnfinished = function(result){

    var now = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() )
    var upperRange = toDateYYMMDD(result['end'],'-')
    var lowerRange = toDateYYMMDD(result['start'],'-')
    
    return (now > lowerRange && now <= upperRange && result.measurement.progress < 1)
}


var getDogGathering = function(month, year){
    var lastdayofmonth = new Date(year, month, 0)
    var THURSDAY = 4

    var doggathering = new Date(lastdayofmonth.getFullYear(), lastdayofmonth.getMonth() + 1, lastdayofmonth.getDate())
    while(true){
        if(doggathering.getDay() == THURSDAY){
            return doggathering
        }
        doggathering.setDate(doggathering.getDate()-1)
    }
   
}

var filterThanksDateInRange = function(element){
    return thanksDateIsInRange(element['Thanks Posted Date'])
}

var thanksDateIsInRange = function(thanksDate){

    if(thanksDate == null){
        return false
    }
    var now = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() )
    var thisMonthsDogGathering = getDogGathering(now.getMonth(), now.getFullYear())
    var lastMonthsDogGathering = getDogGathering(now.getMonth() - 1, now.getFullYear())
    var nextMonthsDogGathering = getDogGathering(now.getMonth() + 1, now.getFullYear())

    var upperRange = null
    var lowerRange = null

    if(now > thisMonthsDogGathering){
        lowerRange = thisMonthsDogGathering
        upperRange = nextMonthsDogGathering
    }else{
        lowerRange = lastMonthsDogGathering
        upperRange = thisMonthsDogGathering
    }

    if((toDate(thanksDate) <= upperRange && toDate(thanksDate) > lowerRange)){
        return true
    }
    return false
    
}

var getHighestThanksBadges = function(result){
    console.log(result)
    var thanksBadges = result.filter(filterThanksDateInRange)
    var leaderboard = {}
    var name = ""

    thanksBadges.forEach(function(element) {
        name = element['First Name'] + ' ' + element['Last Name']
        leaderboard[name] = leaderboard[name] + 1 || 1
    }, this);

    var items = Object.keys(leaderboard).map(function(key) {
        return [key, leaderboard[key]];
    });

    if(items.length == 0){
        return "No thanks badges"
    }

    items.sort(function(first, second) {
        return second[1] - first[1];
    });

    return items[0][0] + " (" + items[0][1] + ")"

}

var getMyThanksBadges = function(element){
    return (element['First Name'] == "Edmund") && (element['Last Name'] == "Dipple") && thanksDateIsInRange(element['Thanks Posted Date'])
}

var timestamp = function(){
    var d = new Date();
    return d.toLocaleTimeString("en-GB", {timeZone: "Europe/London"});
}

var saveWidget = function(name, widget) {
    fs.writeFile("D:/HOME/" + name + ".json", JSON.stringify(widget), function(err) {
      
    }); 
}

class Widget {
  constructor(title, value, subtitle) {
    this.title = title;
    this.value = value;
    this.subtitle = subtitle;
    this.status = "normal";
    this.refresh_timer = 300;
    this.timestamp = timestamp()
    this.type = "value"
  }
}

module.exports.widget = function (context, input) {

    context.res = {
        body: html,
        headers: {
            'Content-Type': 'text/html; charset=utf-8'
        }
    }

    context.done();
}

module.exports.psforgepr = function (context) {

    context.log('JavaScript HTTP trigger function processed a request.');

    var widget = new Widget("PSForge", null, "Open PRs");

    var github = GitHubApi()
    
    github.pullRequests.getAll({owner: "devopsguys", repo: "PSForge"}, function(err, res){

        widget.value = res.data.length

        // saveWidget("psforgepr",widget)

        context.res = {
            body: widget,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        context.done();
    });
};

module.exports.tfvalidatepr = function (context) {
   
    context.log('JavaScript HTTP trigger function processed a request.');

    var github = GitHubApi();

    var widget = new Widget("terraform_validate", null, "Open PRs");

    github.pullRequests.getAll({owner: "elmundio87", repo: "terraform_validate"}, function(err, res){

        widget.value = res.data.length

        // saveWidget("tfvalidatepr",widget)

        context.res = {
            body: widget,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        context.done();
    });
};

module.exports.thanks = function (context) {
    
    context.log('JavaScript HTTP trigger function processed a request.');

    let fetch = require('node-fetch');

    var widget = new Widget("Thanks Badges", null, null);

    fetch('https://api.peoplehr.net/Query', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(peopleHR_options)
    }).then(response => {
        return response.json();
    }).then(response => {

        context.log("Received PeopleHR data")

        widget.value = response.Result.filter(getMyThanksBadges).length
        widget.subtitle = getHighestThanksBadges(response.Result)

        context.res = {
            body: widget,
            headers: {
                'Content-Type': 'application/json'
            }
        };
        context.done();
    });

};

module.exports.hourslogged = function (context) {

    context.log('JavaScript HTTP trigger function processed a request.');

    var widget = new Widget("Hours Logged", "??", "??");
    widget.status = "inactive";

    context.res = {
        body: widget,
        headers: {
            'Content-Type': 'application/json'
        }
    };
    context.done();
};

module.exports.incidents = function (context) {
  
    context.log('JavaScript HTTP trigger function processed a request.');

    var jira = new JiraApi(jira_options);
    let fetch = require('node-fetch');

    var widget = new Widget("Incidents", null, null);

    jira.searchJira('type = "Incident" and statusCategory != "Done" and status != "Feedback"').then(function(result) { 

        if(result.issues.length > 0){
            widget.status = "critical"
        }

        var todays_date = new Date().getFullYear() + "-" + (new Date().getMonth() + 1) + "-" + new Date().getDate()
        var pd_url = 'https://api.pagerduty.com/schedules/POMY3BM?time_zone=GMT&since=' + todays_date + 'T12%3A00%3A00-00%3A00&until=' + todays_date + 'T13%3A00%3A00-00%3A00'
        
        fetch(pd_url, {
            method: 'GET',
            headers: {
                'Accept': 'application/vnd.pagerduty+json;version=2',
                'Authorization': "Token token=" + app_config.pagerdutyAPI
            }
        }).then(response => {
            return response.json();
        }).then(response => {
           
            var subtitle = "No-one on call"

            try{
                subtitle = response.schedule.final_schedule.rendered_schedule_entries[0].user.summary
            }catch(e){
                context.log(e)
            }

            widget.value = result.issues.length
            widget.subtitle = subtitle

            context.res = {
                body: widget,
                headers: {
                    'Content-Type': 'application/json'
                }
            };
           
            context.done();
        })

    })

};

module.exports.dogdesk = function (context) {

    context.log('JavaScript HTTP trigger function processed a request.');

    var jira = new JiraApi(jira_options);
    
    var widget = new Widget("DOGDESK", null, "Awaiting support");

    jira.searchJira('assignee = CurrentUser() AND status != "Resolved" AND status != "Waiting for Customer" and status != "Awaiting Approval" and project = DOGDESK').then(function(result) { 
        
        widget.type = "dial"
        widget.dial = {
            "min": 0,
            "max": 4,
        }

        widget.value = result.issues.length

        context.res = {
            body: widget,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        context.done();
    })
};

module.exports.mydogdesk = function (context) {

    context.log('JavaScript HTTP trigger function processed a request.');

    var jira = new JiraApi(jira_options);
    
    var widget = new Widget("DOGDESK", null, "Created by me");

    jira.searchJira('reporter = currentUser() and project = DOGDESK and type != "Licence"  and (status = "Awaiting Approval" or status = "Waiting for support" or status = "To Do")').then(function(result) { 
        
        widget.type = "dial"
        widget.dial = {
            "min": 0,
            "max": 4,
        }

        widget.value = result.issues.length

        context.res = {
            body: widget,
            headers: {
                'Content-Type': 'application/json'
            }
        };
        context.done();
    })
};

module.exports.ticketsinactive = function (context) {

    context.log('JavaScript HTTP trigger function processed a request.');

    var jira = new JiraApi(jira_options);
    
    var widget = new Widget("Active or Testing", null, "Jira Tickets");

    jira.searchJira('assignee = CurrentUser() and (status = "Active" OR  status = "Testing" OR status = "In-Progress")').then(function(result) { 

        widget.type = "dial"
        widget.dial = {
            "min": 0,
            "max": 4,
        }
        widget.value = result.issues.length

        context.res = {
            body: widget,
            headers: {
                'Content-Type': 'application/json'
            }
        };
        context.done();
    })
};

module.exports.ticketsinfeedback = function (context) {

    context.log('JavaScript HTTP trigger function processed a request.');
    
    var jira = new JiraApi(jira_options);

    var widget = new Widget("Feedback", null, "Jira Tickets");

    jira.searchJira('assignee = CurrentUser() and status = "Feedback"').then(function(result) { 
        
        widget.type = "dial"
        widget.dial = {
            "min": 0,
            "max": 4,
        }
        widget.value = result.issues.length
    
        context.res = {
            body: widget,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        context.done();
    })
};

module.exports.dogrecruit = function (context) {

    context.log('JavaScript HTTP trigger function processed a request.');
    
    var jira = new JiraApi(jira_options);

    var widget = new Widget("Recruitment", null, "CVs to review");

    jira.searchJira('project = DOGRECRUIT and (status = "Under Review" OR status = "Open") and ("Epic Link" = DOGRECRUIT-247 or assignee = CurrentUser())').then(function(result) { 
        
        widget.type = "dial"
        widget.dial = {
            "min": 0,
            "max": 5,
        }
        widget.value = result.issues.length
    
        context.res = {
            body: widget,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        context.done();
    })
};

module.exports.betterworks = function (context) {
    
    context.log('JavaScript HTTP trigger function processed a request.');

    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    
    var widget = new Widget("Betterworks", null, null);

    let fetch = require('node-fetch');

    fetch('https://app.betterworks.com/api/beta/goals/filter/?owner=' + betterworks_options.UserID, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': "APIToken " + betterworks_options.APIKey
        }
    }).then(response => {
        return response.json();
    }).then(response => {

        var currentGoals = response.results.filter(betterworksMilestonesActive)
        var unfinishedGoals = response.results.filter(betterworksMilestonesUnfinished)

        var subtitle = "0 days"
        var value = "N/A"

        if(unfinishedGoals.length > 0){

            var progress_array = currentGoals.map(function(x) {
                return x.measurement.progress
            });

            var progress = Math.round(progress_array.average() * 100 )

            unfinishedGoals.sort(function(a, b) {
                return parseFloat(a.last_checkedin) -  parseFloat(b.last_checkedin);
            });

            var now = new Date()
            var last_checkedin = new Date(unfinishedGoals[0].last_checkedin * 1000)

            var subtitle = dateDiffInDays(last_checkedin, now)
            if(subtitle == 1){
                subtitle = subtitle + " day since checkin"
            }else{
                subtitle = subtitle + " days since checkin"
            }
            var value = progress + "%"

        }

        widget.value = value
        widget.subtitle = subtitle
      
        context.res = {
            body: widget,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        context.done();
    });

};

module.exports.jsoninput = function (context, input) {

    context.log('JavaScript HTTP trigger function processed a request.');
    context.log(context)
    context.log(input)

    var file = 'D:/HOME/' + input.query.json + '.json'
    fs.writeFile(file, JSON.stringify(input.body), function (err) {
        if (err) return context.log(err);
        context.log("Written to file " + file)
    });

    context.res = {
        body: "",
        headers: {
            'Content-Type': 'application/json'
        }
    };

    context.done();

};

module.exports.linuxupdates = function (context, input) {

    context.log('JavaScript HTTP trigger function processed a request.');

    const MsRest = require('ms-rest-azure');
    const OperationalInsightsManagement = require("azure-arm-operationalinsights");

    var widget = new Widget("Linux", null, "servers to update");

    var callback = function(err,result){
        try{
            widget.value = result.metadata.total
            context.res = {
                body: widget,
                headers: {
                    'Content-Type': 'application/json'
                }
            };
            context.done();
        }catch(e){
            context.log(e)
        }

    }

    try{
        MsRest.loginWithServicePrincipalSecret(azure_config.azureServicePrincipalClientId, azure_config.azureServicePrincipalPassword, azure_config.azureServicePrincipalTenantId).then((credentials) => {
            return new OperationalInsightsManagement(credentials, azure_config.azureSubId);
        }).then((client) => {
            return client.savedSearches._getResults("mms-weu","elmundio87","db07e739-cafa-4b95-a9d4-75a1f065793b", callback)
        })
    }catch(e){
        context.log(e)
    }

};

module.exports.windowsupdates = function (context, input) {

    context.log('JavaScript HTTP trigger function processed a request.');
    
    const MsRest = require('ms-rest-azure');
    const OperationalInsightsManagement = require("azure-arm-operationalinsights");

    var widget = new Widget("Windows", null, "servers to update");

    var callback = function(err,result){
        try{
            widget.value = result.metadata.total
            context.res = {
                body: widget,
                headers: {
                    'Content-Type': 'application/json'
                }
            };
            context.done();
        }catch(e){
            context.log(e)
        }

    }

    try{
        MsRest.loginWithServicePrincipalSecret(azure_config.azureServicePrincipalClientId, azure_config.azureServicePrincipalPassword, azure_config.azureServicePrincipalTenantId).then((credentials) => {
            return new OperationalInsightsManagement(credentials, azure_config.azureSubId);
        }).then((client) => {
            return client.savedSearches._getResults("mms-weu","elmundio87","71e3da85-8fd8-410a-a21f-87f72fbdabb6", callback)
        })
    }catch(e){
        context.log(e)
    }

};

module.exports.darksky = function (context) {
    
    context.log('JavaScript HTTP trigger function processed a request.');

    let fetch = require('node-fetch');

    var widget = new Widget("Is it raining?", null, null);

    var toCelsius = function(f) {
        return Math.round((5/9) * (f-32));
    }

    fetch('https://api.darksky.net/forecast/' + app_config.darksky_APIKey + '/51.483075,-3.1796354', {
        method: 'GET',
        headers: {'Content-Type': 'application/json'}
    }).then(response => {
        return response.json();
    }).then(response => {

        context.log("Received DarkSky data")

        var isRaining = (response.currently.icon === "rain")

        widget.value = (isRaining ? "Yes" : "No");
        widget.status = (isRaining ? "rain" : "normal")
        widget.subtitle = "Cardiff (" + toCelsius(response.currently.apparentTemperature) + "\u00B0)"

        context.res = {
            body: widget,
            headers: {
                'Content-Type': 'application/json'
            }
        };
        context.done();
    });

};