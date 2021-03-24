var request = require('request');


main();

function main() {

    var action;
    var poll_url;
    var poll_option;

    process.argv.forEach((val, index, array) => {
        if (index == 0 || index == 1) {
            return;
        }

        if (val.includes('--action=')) {
            action = val.split("=")[1];
            return;
        }

        if (val.includes('http')) {
            console.log("url: ", val);
            poll_url = val;
            return;
        }

        console.log("option: ", val)
        poll_option = val;
    });

    if (!action) {
        return console.err("specify an action");
    } else if (action == "poll_spam") {
        pollVoteSpam(poll_url, poll_option);
    } else if (action == "quiz_ans") {
        quizAnswers();
    }
}

function pollVoteSpam(pUrl, pOption) {
    console.log(pUrl)
    getActiveQ(pUrl).then((res) => {
        var scrape = scrapeBody(res);
        var activeQuestion = parseScrape(scrape);
        activeQuestion.option = activeQuestion.question.choices.find(c => c.label == pOption);

        var vote_url = `https://www.menti.com/core/votes/${activeQuestion.pubk}`;

        var option = { question_type: "choices", vote: "to_be_filled" };
        console.log('Available options:');
        console.log(activeQuestion.option);
        option.vote = activeQuestion.option.id;

        voteSequence(vote_url, option);
    }).catch(err => {
        console.error(err)
    });
}

let voteCount = 0;
function voteSequence(vote_url, option) {
    console.log(`Vote count: ${voteCount}`);
    getId().then((id) => {
        // This waits for one vote to finish then votes again
        //vote(vote_url, id, option).then(() => { voteSequence(vote_url, option) });
        
        // This votes without waiting
        vote(vote_url, id, option).then(() => {
            voteCount++;
        });
        voteSequence(vote_url, option);
    });
}

function parseScrape(scrape) {
    var activeQuestion = {};
    activeQuestion.pubk = scrape.pace.presenter.activeQuestion.public_key;
    activeQuestion.id = scrape.pace.presenter.activeQuestion.id;
    activeQuestion.question = scrape.questions.find(q => q.id == activeQuestion.id);
    return activeQuestion;
}

function getActiveQ(m_url) {
    return new Promise((resolve, reject) => {
        request({
            method: 'GET',
            uri: m_url,
            har: {
                url: m_url,
                method: 'GET'
            }
        }, (error, res, body) => {
            if (error) {
                reject(error)
            }
            resolve(body)
        });
    });
}

function scrapeBody(body) {
    //shit code ik
    var bsplit = body.split("window.__INITIAL_STATE__ =");
    var bsplit1 = bsplit[1].split("\n");
    var bsplit2 = bsplit1[0].slice(0, bsplit1[0].length - 1)
    var json_body_scrape = JSON.parse(bsplit2);
    return json_body_scrape
}

function getId() {
    var id_url = "https://www.menti.com/core/identifier";

    return new Promise((resolve, reject) => {

        request.post(id_url, { uri: id_url }, (error, res, body) => {
            if (error) {
                console.error(error);
                return reject();
            }
            console.log(body);
            var jbody = JSON.parse(body)
            resolve(jbody.identifier);
        });
    });
}

function vote(url, id, option) {
    return new Promise((resolve, reject) => {

        request.post(
            url,
            {
                uri: url,
                json: option,
                headers: {
                    'x-identifier': `${id}`
                }
            },
            (error, res, body) => {
                if (error) {
                    console.error(error)
                    return reject();
                }
                console.log(`statusCode: ${res.statusCode}`);
                resolve();
            }
        );
    });
}
