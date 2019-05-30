function deleteUser(userId) {
    var mainForm = document.getElementById("mainForm");
    var txtUserId = document.getElementById("userId");
    var ans = confirm("刪除帳號 " + userId + "？");
    if (ans) {
        txtUserId.value = userId;
        mainForm.submit();
    }
}