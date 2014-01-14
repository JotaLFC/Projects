$('#' + id + ' .content1').bind('click', function (e) {
    e.preventDefault();
    getContent('/function-demos/functions/ajax/data/content1.html');
});
 
$('#' + id + ' .content2').bind('click', function (e) {
    e.preventDefault();
    getContent('/function-demos/functions/ajax/data/content2.html');
});
 
$('#' + id + ' .content3').bind('click', function (e) {
    e.preventDefault();
    getContent('/function-demos/functions/ajax/data/content3.html');
});
 
function getContent(filename) {
    $.ajax({
        url: filename,
        type: 'GET',
        dataType: 'html',
        beforeSend: function () {
            $('#' + id + ' .contentarea').html('<img src="/function-demos/functions/ajax/images/loading.gif">');
        },
        success: function (data, textStatus, xhr) {
 
            if (filename == '/function-demos/functions/ajax/data/content3.html') {
                setTimeout(function () {
                    $('#' + id + ' .contentarea').html(data);
                }, 2000);
            } else {
                $('#' + id + ' .contentarea').html(data);
            }
        },
        error: function (xhr, textStatus, errorThrown) {
            $('#' + id + ' .contentarea').html(textStatus);
        }
    });
}
Code to Reset

?
1
2
$('#' + id + ' .contentarea').html('Content will appear here.');
$('#' + id).hide();
