---
layout: default
title: Home
---

<section class="home-section">
<h3 class="section-label">Recent Essays On Productivity</h3>
<ul class="writing-list">
{% for e in site.data.writing limit: 6 %}
  <li>
    <a href="/{{ e.slug }}">
      <strong>{{ e.title }}</strong>
      <span>{{ e.description }}</span>
    </a>
  </li>
{% endfor %}
</ul>
<p class="more-link"><a href="/writing">All essays →</a> &nbsp; <a href="/about">Full portfolio →</a></p>
</section>
