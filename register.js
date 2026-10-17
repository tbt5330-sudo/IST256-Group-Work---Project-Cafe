
const form = document.querySelector("form");

form.addEventListener("submit", function (event) {
    event.preventDefault();

    // Get the form values
    const name = document.getElementById("fullName").value.trim();
    const age = Number(document.getElementById("age").value);
    const email = document.getElementById("email").value.trim().toLowerCase();
    const address = document.getElementById("address").value.trim();
    const phone = document.getElementById("phone").value.trim();

    // Validate the required fields
    if (!name || !email || !address || !age) {
        alert("Please fill in all required fields.");
        return;
    }

    if (age < 1 || age > 120) {
        alert("Please enter a valid age.");
        return;
    }

    // Load existing members from browser storage
    let members = JSON.parse(localStorage.getItem("members")) || [];

    // Check whether the email is already registered
    const emailExists = members.some(
        member => member.email.toLowerCase() === email
    );

    if (emailExists) {
        alert("This email is already registered.");
        return;
    }

    // Create the new member
    const newMember = {
        id: members.length > 0
            ? Math.max(...members.map(member => Number(member.id) || 0)) + 1
            : 1,
        name: name,
        age: age,
        email: email,
        address: address,
        phone: phone
    };

    // Save the member
    members.push(newMember);
    localStorage.setItem("members", JSON.stringify(members));

    alert("Welcome to our cafe! Your registration was successful.");

    form.reset();
});
