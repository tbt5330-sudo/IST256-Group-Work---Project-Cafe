"use strict";

const STORAGE_KEY = "cozyCornerMembers";
const signupForm = document.querySelector("#signup-form");
const signupMessage = document.querySelector("#signup-message");

function showMessage(message, isError = false) {
    signupMessage.textContent = message;
    signupMessage.classList.toggle("is-error", isError);
    signupMessage.classList.toggle("is-success", !isError && message.length > 0);
}

function readMembers() {
    const savedMembers = localStorage.getItem(STORAGE_KEY);

    if (savedMembers === null) {
        return [];
    }

    let members;
    try {
        members = JSON.parse(savedMembers);
    } catch {
        throw new Error(
            "Saved member data could not be read. Clear the Cozy Corner member data in this browser and try again."
        );
    }

    const isValidMember = (member) =>
        member !== null &&
        typeof member === "object" &&
        typeof member.name === "string" &&
        typeof member.email === "string" &&
        typeof member.phone === "string" &&
        typeof member.joinedAt === "string";

    if (!Array.isArray(members) || !members.every(isValidMember)) {
        throw new Error(
            "Saved member data has an unexpected format. Clear the Cozy Corner member data in this browser and try again."
        );
    }

    return members;
}

signupForm.addEventListener("submit", (event) => {
    event.preventDefault();
    showMessage("");

    if (!signupForm.reportValidity()) {
        return;
    }

    const formData = new FormData(signupForm);
    const member = {
        name: formData.get("name").trim(),
        email: formData.get("email").trim(),
        phone: formData.get("phone").trim(),
        joinedAt: new Date().toISOString()
    };

    let members;
    try {
        members = readMembers();
    } catch (error) {
        showMessage(error.message, true);
        return;
    }

    const emailAlreadyRegistered = members.some(
        (savedMember) => savedMember.email.toLowerCase() === member.email.toLowerCase()
    );

    if (emailAlreadyRegistered) {
        showMessage("That email is already on the rewards list.", true);
        signupForm.elements.email.focus();
        return;
    }

    members.push(member);

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(members));
    } catch {
        showMessage(
            "Your browser could not save this signup. Check that site storage is enabled and try again.",
            true
        );
        return;
    }

    signupForm.reset();
    showMessage(`You're on the list, ${member.name}! See you at the cafe.`);
});
