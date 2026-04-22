---
layout: default
title: Essays
hidden: true
redirect_from:
  - /writing/
---

<h1 class="page-title">Essays</h1>

<ul class="essays-list">
  {% assign pool = site.pages | where_exp: "p", "p.description" | sort: "title" %}
  {% for p in pool %}
    <li>
      <a href="{{ p.url }}">
        <strong>{{ p.title }}</strong>
        <span>{{ p.description }}</span>
      </a>
    </li>
  {% endfor %}
</ul>
