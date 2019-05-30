function showPasswordFields() {
    var changePassword = document.getElementById("changePassword");
    var passwordRow = document.getElementById("passwordRow");
    var passwordRow2 = document.getElementById("passwordRow2");
    var txtPwd1 = document.getElementById("password1");
    var txtPwd2 = document.getElementById("password2");
    if (changePassword.checked) {
        passwordRow.style.visibility = "visible";
        passwordRow2.style.visibility = "visible";
        txtPwd1.required = true;
        txtPwd2.required = true;
        txtPwd1.focus();
        txtPwd1.select();
    } else {
        txtPwd1.required = false;
        txtPwd2.required = false;
        passwordRow.style.visibility = "collapse";
        passwordRow2.style.visibility = "collapse";
    }
}

function validatePassword() {
    var txtPwd1 = document.getElementById("password1");
    var txtPwd2 = document.getElementById("password2");
    var pwd1 = String(txtPwd1.value).trim();
    var pwd2 = String(txtPwd2.value).trim();
    if (pwd1.length < 6) {
        alert('密碼至少6碼，不可空格！');
        txtPwd1.focus();
        txtPwd1.select();
        return false;
    }
    if (pwd1 != pwd2) {
        txtPwd2.value = '';
        alert('兩次輸入的密碼不一致！');
        txtPwd2.focus();
        return false;
    }
    return true;
}

function validateInput() {
    var changePassword = document.getElementById("changePassword");
    if (changePassword) {
        if (changePassword.checked) return validatePassword();
    } else {
        return validatePassword();
    }
    return true;
}