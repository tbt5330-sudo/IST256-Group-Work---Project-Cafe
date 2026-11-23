'use strict';

const form = document.getElementById(
    'submissionForm'
);

const message = document.getElementById(
    'submissionMessage'
);

form.addEventListener('submit', async event => {
    event.preventDefault();

    if (!form.reportValidity()) return;

    const button = form.querySelector(
        'button[type="submit"]'
    );

    if (button.disabled) return;

    const data = {};

    [
        'title',
        'author',
        'category',
        'content'
    ].forEach(field => {
        data[field] =
            document.getElementById(field).value.trim();
    });

    button.disabled = true;
    message.hidden = true;

    try {
        const response = await fetch(
            '/api/submissions',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            }
        );

        const result = await response.json();

        if (!response.ok) {
            throw Error(
                result.errors?.join(' ') ||
                'Submission failed.'
            );
        }

        message.className = 'alert alert-success';

        message.textContent =
            `${result.message} ID: ${result.submissionId}`;

        form.reset();
    } catch (error) {
        message.className = 'alert alert-danger';
        message.textContent = error.message;
    } finally {
        message.hidden = false;
        button.disabled = false;
    }
});
