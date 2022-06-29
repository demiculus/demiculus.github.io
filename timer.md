---
layout: default
title: Time Challange
---

# Challenge

<p id="timer"></p>

<script type="text/javascript" charset="utf-8">
	var timeRemaning = 60 * 60 * 24 * 365
	const timerElement = document.getElementById('timer')
	timerElement.innerHTML = timeRemaning

	setInterval(function() { 
		if(timeRemaning <= 0) {
			timerElement.innerHTML = 'Congratz! Email this code with your name to demiculus@gmail.com to obtain your next clue. Code: `5^34Gk(3`'
			clearInterval(interval);
			return
		}
		timeRemaning -= 1
		timerElement.innerHTML = timeRemaning
	}, 1000);
</script>	

Welcome to my challenge. When this timer ends you will access the next clue of this challenge. The timer will take a long time.

Another way to unlock this timer is to learn
- HTML
- Javascript
- Web development

Once you learn these skills, you will be able to unlock the timer at will and get the clue sooner.

Best of luck

Demi Yilmaz