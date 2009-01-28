//<![CDATA[
<!--

/*
Below is the superTextile function by Josh Goebel
http://yyyc514.serversidewiki.com/ 

Algorithms based largely from Ruby's RedCloth.  JavaScript speed improvements
made here and there where it made sense (Firefox used for measurements).

LICENSE: This code may be licensed under GPL 2.0 or newer as long as this comment block is always included.

DISCLAIMER: It's not feature complete (I never got to tables, etc) but it does work for me in Firefox... YMMV :-)

*/

function superTextile(s, tiddlerTitle) {
start_timer("superTextile");

   function regex_quote(str)
   {
   	return str.replace(/([\*\?\+\^\?])/g, "\\$1");
   }

	
	var class_id='(?:\\(([^#]*)(?:#(.*))?\\))?';
	var style="(?:\\{([^}]*)})?";
	var attributes=class_id+style;
	
	/* things we will match later 
	   put them up top to save execution time later */
	var footnote = '^fn([\\d]*)' + attributes + '\\.(.+)';
	   
    var text = s;

	A_HLGN = /(?:(?:<>|<|>|\=|[()]+)+)/;
	A_VLGN = /[\-^~]/;
	C_CLAS = '(?:\\([^)]+\\))';
//	C_LNGE = '(?:\[[^\]]+\])';
	C_LNGE = '(?:\\[[^\\]]+\\])';
	C_STYL = '(?:\{[^}]+\})';
//    S_CSPN = '(?:\\\\\d+)'
//    S_RSPN = '(?:/\d+)'
    A = "(?:" + A_HLGN +"?" + A_VLGN + "?|" + A_VLGN + "?" + A_HLGN + "?)";
    
    A = "";
//    S = "(?:#{S_CSPN}?#{S_RSPN}|#{S_RSPN}?#{S_CSPN}?)"
    C = '(?:' +C_CLAS+'?'+C_STYL+'?'+C_LNGE+'?|' + C_STYL+'?'+C_LNGE+'?'+C_CLAS+'?|' +C_LNGE+'?'+C_STYL+'?'+C_CLAS +'?)';
//	C="(?:" +C_LNGE+ '?)';

    GLYPHS =[
            [ /([^\s\[{(>])"/, '$1&#8221;' ], 		// double closing
	         [ /"(?=\s|[#{PUNCT}])/, '&#8221;' ], 	// double closing	
				[ /"/, '&#8220;' ], 							// double opening
//				[ /\b( )?\.{3}/g, '$1&#8230;' ], 		// ellipsis
				[ /\b([A-Z][A-Z0-9]{2,})\b(?:[(]([^)]*)[)])/, 
				'<acronym title="$2">$1</acronym>' ], // 3+ uppercase acronym
				[ /(\.\s)?\s?--\s?/g, '$1&#8212;' ], 	// em dash
        		[ /\s->\s/g, ' &rarr; ' ], 				// right arrow
		      [ /\s-\s/g, ' &#8211; ' ], 				// en dash
//	     		[ /(\d+) ?x ?(\d+)/g, '$1&#215;$2' ], 	// dimension sign
	  			[ /\b ?[(\[]TM[\])]/ig, '&#8482;' ], 	// trademark
				[ /\b ?[(\[]R[\])]/ig, '&#174;' ], 		// registered
				[ /\b ?[(\[]C[\])]/ig, '&#169;' ] 		// copyright
//				[ /\b ?[(\[](?:C|R|TM)[\])]/ig, '&#169;' ] 	// special symbols
        		];
        		
    QTAGS = [
//				['**', 'b'],
				['*', 'strong'],
				['??', 'cite', "limit"],
				['-', 'del', "limit"],
//				['__', 'i'],
				['_', 'em', "limit"],
				['%', 'span', "limit"],
				['+', 'ins', "limit"],
				['^', 'sup'],
				['~', 'sub']
//				['**|*|__|^|~','strong']
    ];
    SIMPLE_HTML_TAGS = [
    	'tt', 'b', 'i', 'big', 'small', 'em', 'strong', 'dfn', 'code',
      'samp', 'kbd', 'var', 'cite', 'abbr', 'acronym', 'a', 'img', 'br',
      'br', 'map', 'q', 'sub', 'sup', 'span', 'bdo', "hr"];
	
	CODE_RE = /(\W)@(?:\|(\w+?)\|)?(.+?)@(?=\W)/;
	
	function inline_textile_code(text)
	{
	start_timer();
	match=CODE_RE.exec(text);
	while (match!=null)
    	{
    		if (match[2]!=undefined)
    			lang=" lang=\"" + match[2] + "\"";
    		else
    			lang="";
    		out=match[1] + "<code" + lang + ">" + match[3] + "</code>";
			text=text.replace(match[0],out);
    		match=CODE_RE.exec(text);
    	}
   stop_timer("inline_textile_code");
	return text;
	}
	
	function inline_textile_glyphs(text)
	{
    start_timer();
    for (i=0; i<GLYPHS.length; i++)
    	text=text.replace(GLYPHS[i][0],GLYPHS[i][1]);
    stop_timer("glyphs");
   return text;
   }
   
    start_timer();
    for (i=0; i<QTAGS.length; i++)
    {
    	qtag=regex_quote(QTAGS[i][0]);
    	if (QTAGS[i][2]=="limit")
    	{
		qtag_re="(\\W)"+ "("+qtag+")(" + C + ")" + "(?::(\S+?))?"+"(.+?)"+"("+qtag +")"+"(?=\\W)";
			QTAGS[i][4]=new RegExp(qtag_re,"g");
    	}
    	else
    	{
			qtag_re="("+qtag+")(" + C + ")"+"(?::(\\S+?))?"+"(.+?)"+"("+qtag+")";		
	    	QTAGS[i][4]=new RegExp(qtag_re,"g");
    	}
    }

	function inline_textile_span(text)
	{
	start_timer();
    for (i=0; i<QTAGS.length; i++)
    {
    	htag=QTAGS[i][1];
		qtag_re=QTAGS[i][4];
		
/*
		// fast replaces maybe?
		replace all without any special attributes with one fast regex
		replace all WITH ONLY special regex (so we don't hit anything twice) next
		
		positve lookahead for { or (
		(?=[{(])
*/

		if (QTAGS[i][2]=="limit")
		{
			text=text.replace(qtag_re, function(str, sta, qtag, atts, cite, content) {
				atts=pba(atts);
				if (atts!="")
					shelve(atts);
    			return sta + "<" +htag + atts + ">" + content + "</" + htag + ">";	}
				);
		}
		else
			text=text.replace(qtag_re, function(str, qtag, atts, cite, content) {
				atts=pba(atts);
				if (atts!="")
					shelve(atts);
    			return "<" +htag + atts + ">" + content + "</" + htag + ">";	}
				);
		continue;
	 }
    stop_timer("QTAGS");
    return text;
    }
 		
    // links
    PUNCT="";
	LINK_RE = new RegExp(
//				'([\s\\[{(]|[' + PUNCT + '])?' +     // $pre
            '"' +                          // start
            '(' + C +')' +                 // $atts
            '([^"]+?)' +                   // $text
            '\\s?' +
//          '(?:\(([^)]+?)\)(?="))?' +     // $title
				'(?:\\(([^)]+?)\\))?' +
            '":' + 
            '(\\S+?)' +                        // $url
            '(\/)?' +                      // $slash
            '([^\\w\/;]*?)' +               // $post
            '(?=<|\\s|$)' 
       ,"g");
	
	function define(s)
	{
		if (s==undefined)
			return "";
		else
			return s;
	}

   function inline_textile_link(text)
   {
	   start_timer();
	   
	   text=text.replace(LINK_RE,function (str, atts, content, title, url, slash, post)
	   	{
			atts=pba(atts);
			atts+=" href=\"" + url + slash + "\"";
			if (define(title)!="")
				atts+=" title=\"" + title + "\"";
			atts=shelve(atts);
	   	return "<a" +atts + ">" + content + "</a>" + post ;
	   	}
	   );
   
   stop_timer("textile links");
   return text;
   }

    // images
    // TODO - replace with RedCloth
    function inline_textile_image(text)
    {
    start_timer();
    re = new RegExp('!\\b(.+?)\\(\\b(.+?)\\b\\)!','g');
    text = text.replace(re,'<img src="$1" alt="$2">');
    re = new RegExp('!\\b(.+?)\\b!','g');
    text = text.replace(re,'<img src="$1">');
    stop_timer("texttile images");
    return text;
    }

	function lT(text)
	{
		return (text.charAt(0)=="*") ? "ul" : "ol" ;
	}

	LISTS_RE = /(^([#*]+? .*?)(?:\n|$))+/m
	LISTS_CONTENT_RE = /^([#*]+) (.*)$/m

	function block_textile_lists(text)
	{
	start_timer("block_textile_lists");
	
/*
// lambda does not appear faster here for some reason
	text=text.replace(LISTS_RE, function(str)
	{
*/
	i=0;
	match=LISTS_RE.exec(text);
	while (match!=null)
  	{
  		if (i>100)
  			{
  			alert("killing loops");
  			break;
  			}
  		i++;
		lines = match[0].split('\n');

//		lines=str.split('\n');
      last_line = -1
      depth = new Array();
      line_id=0;
      block_applied++;
      for (line_id=0; line_id<lines.length; line_id++)
      {
      	line=lines[line_id];
			if (mat=LISTS_CONTENT_RE.exec(line))
			{
				//tl,atts,content = $~[1..3]
				tl=mat[1]
            content=mat[2]
            if (depth.last())
            {
              	while (depth.last().length > tl.length)
              	{
              		lines[line_id-1]+="</li>\n\t</"+ lT (depth[depth.length-1])+ ">";
              		depth.pop();
              	}
              	if (depth.last().length==tl.length)
              		lines[line_id-1]+="</li>";
              	
            }
            if (depth.last()!=tl)
            {
             	depth.push(tl);
              	// attrs stuff
              	lines[line_id] = "\t<" + lT(tl) + ">\n\t<li>" + content;
            }
            else
              	lines[line_id] = "\t\t<li>" + content;
            last_line=line_id
         }
         else
         {
         last_line=line_id
			}
			if (((line_id - last_line) >1) || (line_id==(lines.length-1)))
			{
				while (depth.last())
				{
					lines[last_line]+="</li>\n\t</"+ lT (depth[depth.length-1])+ ">";
           		depth.pop();
				}
			}
				
		}
				
      out=lines.join( "\n" );
		text=text.replace(match[0],out);
  		match=LISTS_RE.exec(text);
//		return lines.join ("\n");
  	}//);

	add_timer("block_textile_lists");
//	alert(text);
	return text;	
	}
	
	function clean_white_space(text)
	{
	start_timer();
	text=text.replace( /\r\n/g, "\n");
	text=text.replace( /\r/g, "\n" );
   text=text.replace( /\t/g, '    ' );
   text=text.replace( /^ +$/g, '' );
   text=text.replace( /\n{3,}/g, "\n\n" );
   text=text.replace( /"$/g, "\" " );
	
	// text=flush_left(text);
	stop_timer("clean_white_space");
	return text;
	}

	// footnote references
	// FIX FIX FIX
	 re = new RegExp('([^\\s])\\[(\\d*)\\]','g');
	 text=text.replace(re, '$1<sup><a href="#fn$2">$2</a></sup>');

function textile_p(tag, atts, cite, content)
{
	if (atts!="")
		atts=shelve(atts);
	return "\t<" + tag + atts +">" + content + "</" + tag + ">";
}

function textile_fn_( tag, num, atts, cite, content )
{
 	atts += " id=\"fn" + num + "\""
	if (atts!="")
		atts=shelve(atts);
	content = "<sup>" + num + "</sup>" + content;
	return "<p" + atts + ">" + content + "</p>";
}

function textile_bq( tag, atts, cite, content )
{
//	cite, cite_title = check_refs( cite )
	if (cite==undefined)
		cite="";
	else
		cite = " cite=\"" + cite + "\"";
	if (atts!="")
		atts=shelve(atts);
	return "\t<blockquote" + cite + ">\n\t\t<p" + atts +">" + content + "</p>\n\t</blockquote>"
}


function pba(text, element)
{
	if (text==undefined)	return;
	id=""; cls=""; style=""; lang="";
	
	if (mat=/\{([^}]*)\}/.exec(text))
		style+=mat[1];
	if (mat= /\[([^)]+?)\]/.exec(text))
		lang=mat[1];
	if (mat=  /\(([^()]+?)\)/.exec(text))
		cls=mat[1];
	
	if (cls!="")
		if (mat= /^(.*?)#(.*)$/.exec(cls))
		{
		cls=mat[1];
		id=mat[2];
		}
	
	atts="";
	if (style!="") atts += " style=\"" + style + "\"";
	if (lang!="")  atts += " lang=\"" + lang + "\"";
	if (cls!="") atts += " class=\"" + cls + "\"";
	if (id!="") atts += " id=\"" + id + "\"";
	return atts;
}

//BLOCK_RE = /^(([a-z]+)(\d*))(#{A}#{C})\.(?::(\S+))? (.*)$/m
//BLOCK_RE = /^(([a-z]+)(\d*))\.(?::(\S+))? (.*)$/m
BLOCK_RE = new RegExp('^(([a-z]+)(\\d*))(' + A + C + ')\.(?::(\S+))? (.*)$','m');

function block_textile_prefix(text)
{
	var out="";
	start_timer("block_textile_prefix");
	
	text=text=text.replace(BLOCK_RE,
		function(str,tag,tagpre,num,atts,cite,content)
		{
			atts=pba(atts);
			block_applied++;
			if (tag.charAt(0)=="p" || tag.charAt(0)=="h")
			 	out=textile_p(tag,atts,cite,content);
			if (tag.charAt(0)=="f")
				out=textile_fn_(tag,num,atts,cite,content);
			if (tag.charAt(0)=="b")
				out=textile_bq (tag, atts, cite, content);
			return out;
		}
	);

	add_timer("block_textile_prefix");
	return text;

}

function block_textile_table(text)
{
start_timer("block_textile_table");
add_timer("block_textile_table");
return text;
}

function hard_break(text)
{
start_timer();
text=text.replace( /(.)\n(?! *[#*\s|]|$)/g, "$1<br />");
stop_timer("hard_break");
return text;
}

function incoming_entities(text)
{
start_timer();
text=text.replace( /&(?![#a-z0-9]+;)/i, "x%x%" )
stop_timer("incoming_entities");
return text;
}

function no_textile(text)
{
start_timer();
text.replace( /(^|\s)==([^=]+.*?)==(\s|$)?/,
            '$1<notextile>$2</notextile>$3' );
text.replace( /^ *==([^=]+.*?)==/m,
            '$1<notextile>$2</notextile>$3' );
stop_timer("no_texttile");
return text;
}

BLOCKS_GROUP_RE = /\n{2,}(?! )/m


var block_applied=0;
function blocks(text, deep_code)
{
	start_timer("blocks");
	blks=text.split(BLOCKS_GROUP_RE);
	for (var k=0; k<blks.length; k++)
	{
		blk=blks[k];
		//alert(blk);
		plain = ! /\A[#*> ]/.test(blk);
		match=/^<\/?(\w+).*>/.exec(blk)
		if (match && ! SIMPLE_HTML_TAGS.find(match[1]) )
			break;
		else
		{
//		blk.strip!
//    if blk.empty?
//      blk
//    else
 		code_blk="";
//		blk.gsub!( /((?:\n(?:\n^ +[^\n]*)+)+)/m ) do |iblk|
//			flush_left iblk
//			blocks iblk, plain
//			iblk.gsub( /^(\S)/, "\t\\1" )
//			if plain
//				code_blk = iblk; ""
//			else
//				iblk
//			end
//		end
		block_applied=0;
//		if (/^| /.test(blk)) // save speed
//			blk=block_textile_table(blk);		// RedCloth
		if (/^[#*] /m.test(blk)) // save speed
			blk=block_textile_lists(blk);		// RedCloth
//		if (/^.+?\. /.test(blk)) // save speed
			blk=block_textile_prefix(blk);	// RedCloth	
		if (block_applied==0)
			if (deep_code)
				blk="\t<pre><code>" + blk + "</code></pre>";
			else
				blk="\t<p>" + blk + "</p>";
		blk+="\n" + code_blk;
		}
		blks[k]=blk;
	}

	text=blks.join("\n\n");
	stop_timer("blocks", blks.length + " items");
	return text;
}

function shelve(text)
{
shelf.push(text);
return " <" + shelf.length + ">";
}

SHELVED_RE= / <(\d+)>/g;

function retrieve_text(text)
{
	start_timer();
	len=shelf.length;

	text=text.replace(SHELVED_RE,function(str, i) {
		return shelf[i-1]; }
		);
	stop_timer("retrieve_text",len + " items");
	return text;
		
/* Original RedCloth, SLOW
	while (shelf.last())
		text=text.replace(" <" + shelf.length + ">", shelf.pop());
*/
}

WIKI_RE=new RegExp(wikiNamePattern,"g");
BRACKET_RE=new RegExp(bracketNamePattern,"g");

function inline_textile_tiddlylinks(text)
{
	start_timer();
	
	text=text.replace(WIKI_RE, function(str) {
		return createTiddlyLink("html",str,true);	}
		);
	text=text.replace(BRACKET_RE, function(str,title) {
		return createTiddlyLink("html",title,true);	}
		);
	
	stop_timer("inline_textile_tiddlywiki");
	return text;
}


MACRO_RE= new RegExp("<<([^>\\s]+)(?:\\s*)([^>]*)>>","g");

function rip_macros(text)
{
	start_timer();
	text=text.replace(MACRO_RE, function(str,macroName,macroParams)
	{ return shelve(str); }
	);
	return text;
}


function inline_textile_macro(text)
{
	start_timer();
	text=text.replace(MACRO_RE, function(str,macroName,macroParams) 
		{
		var params = macroParams.readMacroParams();
		try
		{
			var macro = config.macros[macroName];
			if(macro && macro.handler)
			{
				place=document.createElement("div");
				place.id="xxxxxx" + tiddlerTitle;
				macro.handler(place,macroName,params);
				return place.innerHTML;
			}
			else
				//createTiddlyElement(place,"span",null,"errorNoSuchMacro","<<" + macroName + ">>");
				return "no such macro: " + macro;
		}
		catch(e)
		{
			displayMessage(config.messages.macroError.format([macroName]));
			displayMessage(e.toString());
		}
		}
		);
	
	stop_timer("inline_textile_macro");
	return text;
}

	var shelf=[];

	text=incoming_entities(text);			// RedCloth
   text=clean_white_space(text);			// RedCloth
   text=no_textile(text);					// RedCloth

//	text=rip_offtags(text)
	text=hard_break(text);					// RedCloth
//	text=refs_textile(text);				// RedCloth

	// blocks
	text=blocks(text);
	total_timer("block_textile_table")
	total_timer("block_textile_lists")
	total_timer("block_textile_prefix");

	// inline processing
	text=inline_textile_image(text); 
	text=inline_textile_link(text);		// RedCloth
	text=inline_textile_code(text);		// RedCloth
	text=inline_textile_glyphs(text);	// RedCloth
	text=inline_textile_span(text);		// RedCloth
	
	// as long as we're called last we don't have to protect
	// attributes using the shelf which is good because
	// then I'd have to modify the createTiddlyLink function
	// even more, and that'd be bad
	
	// rip out macros so tiddlylinks doesn't eat them
	text=rip_macros(text);
	text=inline_textile_tiddlylinks(text);	// TiddlyWiki

// text=smooth_offtags(text);
	
	text=retrieve_text(text);
	text=inline_textile_macro(text);			// TiddlyWiki

	start_timer("final cleanup");
	text=text.replace( /<\/?notextile>/, '' );
	text=text.replace( "x%x%", '&#38;' );
	stop_timer("final cleanup");
	
	
//	alert(text);
	stop_timer("superTextile");
	return text;
}

Array.prototype.last = function()
{
	if (this.length==0)
		return null;
	else
		return this[this.length-1];
}


//-->
//]]>
