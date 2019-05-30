function autoPostback() {
    $('#mainForm').submit();
}

function userCancelOrderHandler() {
    const cssDisappear = { "display": "none", "visibility": "collapse" };
    const cssAppear = { "display": "inline", "visibility": "visible" };
    var state = $('#userCancelOrderButton').val();
    if (state == "取消") {
        $('#userCancelOrderButton').val("不取消訂單");
        $('#userCancelOrderButton').attr("title", "不取消訂單");
        $('#userOrderStatusPanel').css(cssDisappear);
        $('#userCancelOrderPanel').css(cssAppear);
        $('#userCancelOrderReason').focus().select();
    } else {
        $('#userCancelOrderButton').val("取消");
        $('#userCancelOrderButton').attr("title", "取消訂單");
        $('#userOrderStatusPanel').css(cssAppear);
        $('#userCancelOrderPanel').css(cssDisappear);
    }
}

function userCancelOrderSubmitHandler() {
    var reason = $('#userCancelOrderReason').val();
    if (reason.trim().length < 2) {
        $('#userCancelOrderReason').focus().select().css("background-color", "yellow");
        alert("請填寫取消訂單的理由!");
        return;
    }
    autoPostback();
}