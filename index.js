<html>
  <head>
      <script src="https://code.jquery.com/jquery-3.2.1.min.js" integrity="sha256-hwg4gsxgFZhOsEEamdOYGBf13FyQuiTwlAQgxVSNgt4=" crossorigin="anonymous"></script>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/raphael/2.2.7/raphael.min.js"></script>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/justgage/1.2.9/justgage.min.js"></script>
      <style>

          body {
              transition: background 0.5s linear;
              font-family: "-apple-system",BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Helvetica,Ubuntu,Arial,sans-serif,"Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol";
          }

          .inactive {
              background-color: grey;
          }

          .rain {
              background-color: skyblue;
          }

          .normal {
               background-color: white;
          }

          .warning {
               background-color: yellow;
          }

          .critical {
               background-color: red;
          }

          #title {
              font-size: 12pt;
          }

          #value {
                  font-size: 72px;
                  font-weight: 300;
              /*  width: 100px; */
                  height: 100px; 
          }

          #subtitle {
              font-size: 14px;
          }

          #timestamp {
              position: absolute;
              bottom: 0px;
              right: 0px;
              font-size: 5pt;
              color: grey;
          }

      </style>
  </head>
  <body>
      <div class="widget">
          <div id="title">??</div>
          <div id="value">??</div>
          <div id="subtitle">??</div>
      </div>
      <div id="timestamp">??</div>
      <script>

          var dial = new Object

          var refresh = function() {
              callAjax(url, callback);
          }
          
          document.body.addEventListener('click', refresh, true);

          var getParameterByName = function(name) {
              var match = RegExp('[?&]' + name + '=([^&]*)').exec(window.location.search);
              return match && decodeURIComponent(match[1].replace(/\\+/g, ' '));
          }

          var url = window.location.protocol + "//" + getParameterByName("host") + "/api/" + getParameterByName("name") + "?&code=" + getParameterByName("code") 
          var callAjax = function(url, callback){
              var xmlhttp;
              // compatible with IE7+, Firefox, Chrome, Opera, Safari
              xmlhttp = new XMLHttpRequest();
              xmlhttp.onreadystatechange = function(){
                  if (xmlhttp.readyState == 4 && xmlhttp.status == 200){
                      callback(xmlhttp.responseText);
                  }
              }
              xmlhttp.open("GET", url, true);
              xmlhttp.send();
          }

          var callback = function(response){
              var data = JSON.parse(response)

              var body = $("body")[0];
              var title = $("#title");
              var timestamp = $("#timestamp");
              var value = $('#value')
              var subtitle = $('#subtitle')
              title.html(data.title);
              timestamp.html(data.timestamp);

              if(data.type == "value"){
                  
                  body.className = data.status;

                  if(value.html() != data.value){
                      $('#value').fadeOut('slow', function() {
                          $('#value').html(data.value);
                          $('#value').fadeIn('slow');
                      });
                  }

              }

              if(data.type == "dial"){

                  if($("#value svg")[0] == null){
                      
                      $("#value").css({
                          "width": "144px",
                          "height": "100px"
                      });
       
                      $("#value").text("")
                      dial = new JustGage({
                          id: "value",
                          value: data.value,
                          min: data.dial.min,
                          max: data.dial.max,
                          hideMinMax: false,
                          valueMinFontSize: "50pt",
                          valueFontFamily: '"-apple-system",BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Helvetica,Ubuntu,Arial,sans-serif,"Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol"'
                      });                     
                  }
                  else{
                      dial.refresh(data.value)
                  }
                  $("#value text")[0].setAttribute("y",85)
                  $("#value text")[0].style.fontWeight = 300
                  $("#value text")[2].setAttribute("y",85)
                  $("#value text")[3].setAttribute("y",85)
              }
              
              if(subtitle.html() != data.subtitle){
                  $('#subtitle').fadeOut('slow', function() {
                      $('#subtitle').html(data.subtitle);
                      $('#subtitle').fadeIn('slow');
                  });
              }

          }

          callAjax(url, callback)
          setInterval(function(){ callAjax(url, callback) }, 300000);

      </script>
  </body>
</html>