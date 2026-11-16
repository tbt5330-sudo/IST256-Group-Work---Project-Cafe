
'use strict';

document.addEventListener('DOMContentLoaded', function () {

  document.querySelectorAll('#signupModal form')
    .forEach(function (form) {

      form.addEventListener('submit', function (event) {
        event.preventDefault();

        if (!form.reportValidity()) return;

        const field = id =>
          form.querySelector('#' + id)?.value.trim() || '';

        const member = {
          name: field('name'),
          age: Number(field('age')),
          email: field('email').toLowerCase(),
          address: field('address'),
          phone: field('phone')
        };

        if (
          !member.name ||
          !member.email ||
          !member.address ||
          member.age < 1 ||
          member.age > 120
        ) {
          alert(
            'Please complete all required fields with a valid age.'
          );
          return;
        }

        let members = [];

        try {
          members = JSON.parse(
            localStorage.getItem('members') || '[]'
          );
        } catch (_) {
          alert('Saved member data is invalid.');
          return;
        }

        if (!Array.isArray(members)) {
          alert('Saved member data is invalid.');
          return;
        }

        if (
          members.some(
            m => m.email === member.email
          )
        ) {
          alert('This email has already signed up.');
          return;
        }

        members.push({
          ...member,
          joinedAt: new Date().toISOString()
        });

        localStorage.setItem(
          'members',
          JSON.stringify(members)
        );

        form.reset();

        alert(
          'Signup saved in this browser for the class demonstration!'
        );
      });

    });

});
