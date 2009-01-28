    var current_slide = 0;
    var total_slides = null;
    var slide_height = 860;
    
    var mouseHandle = function(e) {
      if (e.clientX <= 10) {
        x$("#nav").setStyle("display","none");
      } else {
        x$("#nav").setStyle("display","block");
      }
    }

    var slideHandle = function(e) {
      var n = e.target.id.split('_')[1];
      var d = parseInt(n) * slide_height;
      current_slide = parseInt(n);
      setMenu();
      anim(-d);    	   
    }

    var nextSlideHandle = function() {
      if (current_slide < total_slides) {
        current_slide += 1;
        var d = current_slide * slide_height;
        setMenu();
        anim(-d);
      }
    }
        
    var anim = function(to) {
      var attributes = {  top: { to: to } }; 
    	var myAnim = new YAHOO.util.Anim('container', attributes,.5,YAHOO.util.Easing.easeOut); 
    	myAnim.animate();      
    }
    
    var setMenu = function() {
      x$('#nav li').removeClass('highlight');
      x$('#s_' + current_slide).addClass('highlight');
    }

    var keySlideHandle = function(e) {
      window.scroll(0,0);

      // up = 38 | down = 40
      if (e.keyCode == 40) {
        nextSlideHandle();
      }
      if (e.keyCode == 38) {
        if (current_slide > 0) {
          current_slide -= 1;
          setMenu();
          var d = (current_slide) * slide_height;
          anim(-d);        
        }
      }
    }    
    
    x$(window).load(function(){
      

      
      x$(window).on('keyup',keySlideHandle);
      x$(window).on('mousemove',mouseHandle);
      // This interupts the click on the menu items.
//      x$('body').on('click',nextSlideHandle);
                  
      var path = document.location;
      var file = path.search.substr(1);
      if (file == "") file = "sample.txt";
      
      converter = new Showdown.converter();
      
      x$('body').xhr("presentations/" + file + "?" + Math.random(),{
        callback:function() {
            var content = this.responseText;
            var contents = content.split('===');

            
			for (var i = 0; i < contents.length;i++) {
				var div = document.createElement('div');
				var a = document.createElement('a');
				a.name = 'a_' + i;

				div.className = 'slide';
             
				text = converter.makeHtml(contents[i]);
				div.innerHTML = text;
				div.id = 'd_' + i;
				x$('#container').html('bottom',div);
				x$('div.slide:last-child').html('top',a);
              
				var li = document.createElement('li');
				li.id = 's_' + i
              
				var d2 = div.cloneNode(true);
				

				li.appendChild(d2);
              
				x$('div#nav ul:first-child').html('bottom',li);
				x$('div#nav .slide a[name]').html('remove');
			
				x$(li).click(slideHandle);
				total_slides = i;
            }
            
			// Fix up the code blocks with PRE and add a pre class 
			x$('#container .slide code').each(function(e){
			  var nameattr = document.createAttribute("name");
			  nameattr.value = 'code';
			  var pre = document.createElement('pre');
			  pre.setAttributeNode(nameattr);
			  pre.className = 'js';
			  pre.innerHTML = e.innerHTML;
			  e.innerHTML = '';
			  e.appendChild(pre);
			})

            x$('#s_0').addClass('highlight');

			dp.SyntaxHighlighter.ClipboardSwf = '/flash/clipboard.swf';
		  	dp.SyntaxHighlighter.HighlightAll('code');
        }
      });
    })