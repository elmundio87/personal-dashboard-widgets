'use strict';

let fetch = require('node-fetch');
let JiraApi = require('jira-client');
let GitHubApi = require('github');
let fs = require('fs');
let path = require('path');

Array.prototype.sum = Array.prototype.sum || function() {
  return this.reduce(function(sum, a) {
     return sum + Number(a);
  }, 0);
};

Array.prototype.average = Array.prototype.average || function() {
  return this.sum() / (this.length || 1);
};

let JiraOptions = {
    protocol: 'https',
    host: 'devopsguys.atlassian.net',
    username: '#{jira_username}#',
    password: '#{jira_password}#',
    apiVersion: '2',
    strictSSL: true,
};

let AppConfig = {
  'pagerdutyAPI': '#{pagerdutyAPI}#',
  'oms_workspace': '#{oms_workspace}#',
  'oms_sharedkey': '#{oms_sharedkey}#',
  'darksky_APIKey': '#{darksky_APIKey}#',
};

let PeopleHROptions = {
  'APIKey': '#{peopleHR_APIKey}#',
  'Action': 'GetQueryResult',
  'QueryName': 'Thanks Badges',
};

let BetterWorksOptions = {
    'APIKey': '#{betterworks_APIKey}#',
    'UserID': '#{betterworks_UserID}#',
};

let dateDiffInDays = function(a, b) {
    let _MS_PER_DAY = 1000 * 60 * 60 * 24;
    // Discard the time and time-zone information.
    let utc1 = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
    let utc2 = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());

    return Math.floor((utc2 - utc1) / _MS_PER_DAY);
};


let toDate = function(dateStr, separator) {
    if (typeof separator == 'undefined') {
      separator = '/';
    };

    let parts = dateStr.split(separator);
    return new Date(parts[2], parts[1] - 1, parts[0]);
};

let toDateYYMMDD = function(dateStr, separator) {
    if (typeof separator == 'undefined') {
      separator = '/';
    };

    let parts = dateStr.split(separator);
    return new Date(parts[0], parts[1] - 1, parts[2]);
};

let betterworksMilestonesActive = function(result) {
    let now = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() );
    let upperRange = toDateYYMMDD(result['end'], '-');
    let lowerRange = toDateYYMMDD(result['start'], '-');

    return (now > lowerRange && now <= upperRange);
};

let betterworksMilestonesUnfinished = function(result) {
    let now = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() );
    let upperRange = toDateYYMMDD(result['end'], '-');
    let lowerRange = toDateYYMMDD(result['start'], '-');

    return (now > lowerRange && now <= upperRange && result.measurement.progress < 1);
};


let getDogGathering = function(month, year) {
    let lastdayofmonth = new Date(year, month, 0);
    let THURSDAY = 4;

    let doggathering = new Date(lastdayofmonth.getFullYear(), lastdayofmonth.getMonth() + 1, lastdayofmonth.getDate());
    while (true) {
        if (doggathering.getDay() == THURSDAY) {
            return doggathering;
        }
        doggathering.setDate(doggathering.getDate()-1);
    }
};

let filterThanksDateInRange = function(element) {
    return thanksDateIsInRange(element['Thanks Posted Date']);
};

let thanksDateIsInRange = function(thanksDate) {
    if (thanksDate == null) {
        return false;
    }
    let now = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
    let thisMonthsDogGathering = getDogGathering(now.getMonth(), now.getFullYear());
    let lastMonthsDogGathering = getDogGathering(now.getMonth() - 1, now.getFullYear());
    let nextMonthsDogGathering = getDogGathering(now.getMonth() + 1, now.getFullYear());

    let upperRange = null;
    let lowerRange = null;

    if (now > thisMonthsDogGathering) {
        lowerRange = thisMonthsDogGathering;
        upperRange = nextMonthsDogGathering;
    } else {
        lowerRange = lastMonthsDogGathering;
        upperRange = thisMonthsDogGathering;
    }

    if ((toDate(thanksDate) <= upperRange && toDate(thanksDate) > lowerRange)) {
        return true;
    }
    return false;
};

let getHighestThanksBadges = function(result) {
    console.log(result);
    let thanksBadges = result.filter(filterThanksDateInRange);
    let leaderboard = {};
    let name = '';

    thanksBadges.forEach(function(element) {
        name = element['First Name'] + ' ' + element['Last Name'];
        leaderboard[name] = leaderboard[name] + 1 || 1;
    });

    let items = Object.keys(leaderboard).map(function(key) {
        return [key, leaderboard[key]];
    });

    if (items.length == 0) {
        return 'No thanks badges';
    }

    items.sort(function(first, second) {
        return second[1] - first[1];
    });

    return items[0][0] + ' (' + items[0][1] + ')';
};

let getMyThanksBadges = function(element) {
    return (element['First Name'] == 'Edmund') && (element['Last Name'] == 'Dipple') && thanksDateIsInRange(element['Thanks Posted Date']);
};

let timestamp = function() {
    let d = new Date();
    return d.toLocaleTimeString('en-GB', {timeZone: 'Europe/London'});
};

/**
 * Class that models the data consumed by the dashboard widgets
 */
class Widget {
  /**
   * Instantiate the data that the dashboard widget uses
   * @param {string} title The title at the top of the widget
   * @param {string} value The value in the middle of the widget
   * @param {string} subtitle The subtitel text at the bottom of the widget
   */
  constructor(title, value, subtitle) {
    this.title = title;
    this.value = value;
    this.subtitle = subtitle;
    this.status = 'normal';
    this.refresh_timer = 300;
    this.timestamp = timestamp();
    this.type = 'value';
  };
};

module.exports.widget = function(context, input) {
    let html = '';
    
    fs.readFile(path.resolve(__dirname, '..', 'index/index.js'), 'utf8', function(err, data) {
      if (err) {
        html = err;
      }

      context.log(__dirname);
      context.log(path.resolve(__dirname, '..', 'index/index.js'));

      html = data;
      context.log(html);
      context.res = {
        body: html,
        headers: {
            'Content-Type': 'text/html; charset=utf-8',
        },
      };
      context.done();
    });
};

module.exports.psforgepr = function(context) {
    context.log('JavaScript HTTP trigger function processed a request.');

    let widget = new Widget('PSForge', null, 'Open PRs');
    let github = new GitHubApi();

    github.pullRequests.getAll({owner: 'devopsguys', repo: 'PSForge'}, function(err, res) {
        widget.value = res.data.length;
        context.res = {
            body: widget,
            headers: {
                'Content-Type': 'application/json',
            },
        };
        context.done();
    });
};

module.exports.tfvalidatepr = function(context) {
    context.log('JavaScript HTTP trigger function processed a request.');

    let github = new GitHubApi();
    let widget = new Widget('terraform_validate', null, 'Open PRs');

    github.pullRequests.getAll({owner: 'elmundio87', repo: 'terraform_validate'}, function(err, res) {
        widget.value = res.data.length;
        context.res = {
            body: widget,
            headers: {
                'Content-Type': 'application/json',
            },
        };
        context.done();
    });
};

module.exports.thanks = function(context) {
    context.log('JavaScript HTTP trigger function processed a request.');

    let fetch = require('node-fetch');
    let widget = new Widget('Thanks Badges', null, null);

    fetch('https://api.peoplehr.net/Query', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(PeopleHROptions),
    }).then((response) => {
        return response.json();
    }).then((response) => {
        context.log('Received PeopleHR data');

        widget.value = response.Result.filter(getMyThanksBadges).length;
        widget.subtitle = getHighestThanksBadges(response.Result);
        context.res = {
            body: widget,
            headers: {
                'Content-Type': 'application/json',
            },
        };
        context.done();
    });
};

module.exports.hourslogged = function(context) {
    context.log('JavaScript HTTP trigger function processed a request.');

    let widget = new Widget('Hours Logged', '??', '??');
    widget.status = 'inactive';
    context.res = {
        body: widget,
        headers: {
            'Content-Type': 'application/json',
        },
    };
    context.done();
};

module.exports.incidents = function(context) {
    context.log('JavaScript HTTP trigger function processed a request.');

    let jira = new JiraApi(JiraOptions);
    let fetch = require('node-fetch');
    let widget = new Widget('Incidents', null, null);

    jira.searchJira('type = "Incident" and statusCategory != "Done" and status != "Feedback"').then(function(result) {
        if (result.issues.length > 0) {
            widget.status = 'critical';
        }

        let TodaysDate = new Date().getFullYear() + '-' + (new Date().getMonth() + 1) + '-' + new Date().getDate();
        let PagerDutyUrl = 'https://api.pagerduty.com/schedules/POMY3BM?time_zone=GMT&since=' + TodaysDate + 'T12%3A00%3A00-00%3A00&until=' + TodaysDate + 'T13%3A00%3A00-00%3A00';

        fetch(PagerDutyUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/vnd.pagerduty+json;version=2',
                'Authorization': 'Token token=' + AppConfig.pagerdutyAPI,
            },
        }).then((response) => {
            return response.json();
        }).then((response) => {
            let subtitle = 'No-one on call';

            try {
                subtitle = response.schedule.final_schedule.rendered_schedule_entries[0].user.summary;
            } catch (e) {
                context.log(e);
            }

            widget.value = result.issues.length;
            widget.subtitle = subtitle;

            context.res = {
                body: widget,
                headers: {
                    'Content-Type': 'application/json',
                },
            };
            context.done();
        });
    });
};

module.exports.dogdesk = function(context) {
    context.log('JavaScript HTTP trigger function processed a request.');

    let jira = new JiraApi(JiraOptions);
    let widget = new Widget('DOGDESK', null, 'Awaiting support');

    jira.searchJira('assignee = CurrentUser() AND status != "Resolved" AND status != "Waiting for Customer" and status != "Awaiting Approval" and project = DOGDESK').then(function(result) {
        widget.type = 'dial';
        widget.dial = {
            'min': 0,
            'max': 4,
        };
        widget.value = result.issues.length;
        context.res = {
            body: widget,
            headers: {
                'Content-Type': 'application/json',
            },
        };
        context.done();
    });
};

module.exports.mydogdesk = function(context) {
    context.log('JavaScript HTTP trigger function processed a request.');

    let jira = new JiraApi(JiraOptions);
    let widget = new Widget('DOGDESK', null, 'Created by me');

    jira.searchJira('reporter = currentUser() and project = DOGDESK and type != "Licence"  and (status = "Awaiting Approval" or status = "Waiting for support" or status = "To Do" or status = "Waiting for Customer")').then(function(result) {
        widget.type = 'dial';
        widget.dial = {
            'min': 0,
            'max': 4,
        };
        widget.value = result.issues.length;
        context.res = {
            body: widget,
            headers: {
                'Content-Type': 'application/json',
            },
        };
        context.done();
    });
};

module.exports.ticketsinactive = function(context) {
    context.log('JavaScript HTTP trigger function processed a request.');

    let jira = new JiraApi(JiraOptions);
    let widget = new Widget('Active or Testing', null, 'Jira Tickets');

    jira.searchJira('assignee = CurrentUser() and (status = "Active" OR  status = "Testing" OR status = "In-Progress")').then(function(result) {
        widget.type = 'dial';
        widget.dial = {
            'min': 0,
            'max': 4,
        };
        widget.value = result.issues.length;

        context.res = {
            body: widget,
            headers: {
                'Content-Type': 'application/json',
            },
        };
        context.done();
    });
};

module.exports.ticketsinfeedback = function(context) {
    context.log('JavaScript HTTP trigger function processed a request.');

    let jira = new JiraApi(JiraOptions);
    let widget = new Widget('Feedback', null, 'Jira Tickets');

    jira.searchJira('assignee = CurrentUser() and status = "Feedback"').then(function(result) {
        widget.type = 'dial';
        widget.dial = {
            'min': 0,
            'max': 4,
        };
        widget.value = result.issues.length;

        context.res = {
            body: widget,
            headers: {
                'Content-Type': 'application/json',
            },
        };

        context.done();
    });
};

module.exports.dogrecruit = function(context) {
    context.log('JavaScript HTTP trigger function processed a request.');

    let jira = new JiraApi(JiraOptions);
    let widget = new Widget('Recruitment', null, 'CVs to review');

    jira.searchJira('project = DOGRECRUIT and (status = "Under Review" OR status = "Open") and ("Epic Link" = DOGRECRUIT-247 or assignee = CurrentUser())').then(function(result) {
        widget.type = 'dial';
        widget.dial = {
            'min': 0,
            'max': 5,
        };
        widget.value = result.issues.length;

        context.res = {
            body: widget,
            headers: {
                'Content-Type': 'application/json',
            },
        };

        context.done();
    });
};

module.exports.betterworks = function(context) {
    context.log('JavaScript HTTP trigger function processed a request.');

    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

    let widget = new Widget('Betterworks', null, null);
    let fetch = require('node-fetch');

    fetch('https://app.betterworks.com/api/beta/goals/filter/?owner=' + BetterWorksOptions.UserID, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'APIToken ' + BetterWorksOptions.APIKey,
        },
    }).then((response) => {
        return response.json();
    }).then((response) => {
        let currentGoals = response.results.filter(betterworksMilestonesActive);
        let unfinishedGoals = response.results.filter(betterworksMilestonesUnfinished);

        let subtitle = '0 days';
        let value = 'N/A';

        if (unfinishedGoals.length > 0) {
            let ProgressArray = currentGoals.map(function(x) {
                return x.measurement.progress;
            });

            let progress = Math.round(ProgressArray.average() * 100 );

            unfinishedGoals.sort(function(a, b) {
                return parseFloat(a.LastCheckedIn) - parseFloat(b.LastCheckedIn);
            });

            let now = new Date();
            let LastCheckedIn = new Date(unfinishedGoals[0].LastCheckedIn * 1000);

            let subtitle = dateDiffInDays(LastCheckedIn, now);
            if (subtitle == 1) {
                subtitle = subtitle + ' day since checkin';
            } else {
                subtitle = subtitle + ' days since checkin';
            }
            value = progress + '%';
        }

        widget.value = value;
        widget.subtitle = subtitle;

        context.res = {
            body: widget,
            headers: {
                'Content-Type': 'application/json',
            },
        };

        context.done();
    });
};

module.exports.jsoninput = function(context, input) {
    context.log('JavaScript HTTP trigger function processed a request.');
    context.log(context);
    context.log(input);

    let file = 'D:/HOME/' + input.query.json + '.json';
    fs.writeFile(file, JSON.stringify(input.body), function(err) {
        if (err) return context.log(err);
        context.log('Written to file ' + file);
    });

    context.res = {
        body: '',
        headers: {
            'Content-Type': 'application/json',
        },
    };

    context.done();
};

module.exports.darksky = function(context) {
    context.log('JavaScript HTTP trigger function processed a request.');

    let widget = new Widget('Is it raining?', null, null);
    let toCelsius = function(f) {
        return Math.round((5/9) * (f-32));
    };

    fetch('https://api.darksky.net/forecast/' + AppConfig.darksky_APIKey + '/51.483075,-3.1796354', {
        method: 'GET',
        headers: {'Content-Type': 'application/json'},
    }).then((response) => {
        return response.json();
    }).then((response) => {
        context.log('Received DarkSky data');

        let isRaining = (response.currently.icon === 'rain');

        widget.value = (isRaining ? 'Yes' : 'No');
        widget.status = (isRaining ? 'rain' : 'normal');
        widget.subtitle = [
                            'Cardiff (',
                            toCelsius(response.currently.apparentTemperature),
                            '\u00B0)',
                          ].join('');

        context.res = {
            body: widget,
            headers: {
                'Content-Type': 'application/json',
            },
        };
        context.done();
    });
};
