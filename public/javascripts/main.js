
function updateTotal() {
    var tags = document.getElementsByTagName('input');
    var total = 0;
    var qty = 0;
    for (var i = 0; i < tags.length; i++) {
        var t = tags[i];
        if ((t.type == "text") && t.name.endsWith("Sum")) {
            total += Number(t.value);
        } else if ((t.type == "number") && t.name.endsWith("Qty")) {
            qty += Number(t.value);
        }
    }
    var btnOK = document.getElementById("btnOK");
    var txtTotal = document.getElementById("Total");
    var txtQuantity = document.getElementById("Quantity");
    btnOK.disabled = (total < 1);
    txtTotal.value = total.toString();
    txtQuantity.value = qty.toString();
}

function unitSum(priceId, amountId, sumId) {
    var p = document.getElementById(priceId);
    var a = document.getElementById(amountId);
    var s = document.getElementById(sumId);
    s.value = Number(p.value) * Number(a.value);
    updateTotal();
}

function unitPrice(price, priceId, amountId, sumId) {
    var x = document.getElementById(priceId);
    x.value = price;
    unitSum(priceId, amountId, sumId);
}

$(document).ready(function () {
    updateSessionCount();
    setInterval("updateSessionCount()", 15000);
});

function updateSessionCount() {
    $.getJSON("/api/sessionCount", function (data) {
        $('#sessionCount').html('&nbsp;目前線上人數：' + data.sessionCount+'&nbsp;');
    });
}