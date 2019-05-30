function autoPostback() {
    $('#mainForm').submit();
}

function showOrderList(trId) {
    $('#' + trId).toggleClass("hidden");
}

function payOff(userId, userName, amount, orderIds) {
    var ans = confirm("結清 " + userId + " " + userName + " 的應收帳款 " + amount + " 元？");
    if (ans) {
        $('#orderIdList').val(orderIds);
        autoPostback();
    }
}