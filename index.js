const core = require('@actions/core');
const exec = require('@actions/exec');
const github = require('@actions/github');
let fail = true;
let pr_message = true;
let output = '';
const default_no_error_message = 'No lint errors found';

function commentPr(message) {
    const context = github.context;
    const client = github.getOctokit(process.env.GITHUB_TOKEN);
    client.issues.createComment({
        ...context.repo,
        issue_number: context.payload.pull_request.number,
        body: message
    });
}

function parseLintMessage(lint_message) {
    return `${lint_message.type} [${lint_message['message-id']}] ${lint_message.message} (${lint_message.path}:${lint_message.line}:${lint_message.column})`;
}

function buildMessage(pylint_errors, pylint_warnings, pylint_info, pylint_convention, pylint_refactor) {
    let message = '';
    if (pylint_errors.length > 0) {
        message += `===> ${pylint_errors.length} error(s) found:\n`;
        pylint_errors.forEach(error => message += `- ${parseLintMessage(error)}\n`);
    }
    if (pylint_warnings.length > 0) {
        message += `===> ${pylint_warnings.length} warning(s) found:\n`;
        pylint_warnings.forEach(warning => message += `- ${parseLintMessage(warning)}\n`);
    }
    if (pylint_info.length > 0) {
        message += `===> ${pylint_info.length} info(s) found:\n`;
        pylint_info.forEach(info => message += `- ${parseLintMessage(info)}\n`);
    }
    if (pylint_convention.length > 0) {
        message += `===> ${pylint_convention.length} convention(s) found:\n`;
        pylint_convention.forEach(convention => message += `- ${parseLintMessage(convention)}\n`);
    }
    if (pylint_refactor.length > 0) {
        message += `===> ${pylint_refactor.length} refactor(s) found:\n`;
        pylint_refactor.forEach(refactor => message += `- ${parseLintMessage(refactor)}\n`);
    }
    if (message === '') {
        message = default_no_error_message;
    }
    return message;
}

async function run() {
    try {
        // Get inputs
        const path = core.getInput('path');
        fail = core.getInput('fail');
        pr_message = core.getInput('pr-message');

        // Install pylint
        await exec.exec('pip', ['install', 'pylint']);

        // Run pylint
        let options = {};
        options.listeners = {
            stdout: (data) => {
                output += data.toString();
            },
            stderr: (data) => {
                output += data.toString();
            }
        }
        await exec.exec('/bin/bash', ['-c', `pylint ${path} -f json`], options);
    } catch (error) {
        // Parse pylint output
        const pylint_output = JSON.parse(output);
        const pylint_errors = pylint_output.filter(message => message.type == 'error');
        const pylint_warnings = pylint_output.filter(message => message.type == 'warning');
        const pylint_info = pylint_output.filter(message => message.type == 'info');
        const pylint_convention = pylint_output.filter(message => message.type == 'convention');
        const pylint_refactor = pylint_output.filter(message => message.type == 'refactor');

        // Builds message
        const message = buildMessage(pylint_errors, pylint_warnings, pylint_info, pylint_convention, pylint_refactor);
        console.log(message);

        // Comment on PR
        if ((pr_message) && (message !== default_no_error_message)) {
            commentPr(message);
        }

        // Fail if needed
        if ((fail) && (message !== default_no_error_message)) {
            core.setFailed(message);
        }
    }
}

run();