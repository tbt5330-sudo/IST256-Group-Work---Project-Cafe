'use strict';

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll(
        '#signupModal form, #signup-form'
    ).forEach(form => {
        let submitting = false;

        form.addEventListener('submit', async event => {
            event.preventDefault();

            if (
                submitting ||
                !form.reportValidity()
            ) {
                return;
            }

            const field = name =>
                form.querySelector(
                    `#${name}, [name="${name}"]`
                );

            const value = name =>
                field(name)?.value.trim() || '';

            const member = {
                name: value('name'),
                email: value('email').toLowerCase(),
                phone: value('phone')
            };

            if (field('age')) {
                member.age = Number(value('age'));
            }

            if (field('address')) {
                member.address = value('address');
            }

            submitting = true;

            try {
                const response = await fetch(
                    '/api/members',
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(member)
                    }
                );

                const data = await response.json();

                if (!response.ok) {
                    throw Error(
                        data.errors?.join(' ') ||
                        'Registration failed.'
                    );
                }

                form.reset();

                alert(
                    'Registration saved to MongoDB successfully!'
                );
            } catch (error) {
                alert(error.message);
            } finally {
                submitting = false;
            }
        });
    });
});
