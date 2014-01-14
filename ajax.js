//AJAX 'GET'

$.ajax({
  url: 'getTwitterFollowers.php',
  type: 'GET',
  data: 'twitterUsername=jquery4u',
  success: function(data) {
    //called when successful
    $('#ajaxphp-results').html(data);
  },
  error: function(e) {
    //called when there is an error
    //console.log(e.message);
  }
});


//AJAX 'POST"

var $form = $("#myForm");
    var url = $form.attr("action") + "?" + $form.serialize();
    $("#" + id).html(url);

$.ajax({
    type: "POST",
    url: action,
    data: $form,
    success: function(response)
    {
      if(response == 'success')
            $("#myForm").slideUp('slow', function() {
                $("#msg").html("<p class='success'>You have logged in successfully!</p>");
            });
      else
            $("#msg").html("<p class='error'>Invalid username and/or password.</p>");
    }
});
