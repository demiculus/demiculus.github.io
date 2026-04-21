---
layout: default
title: Writing
hidden: true
---

<h1 class="page-title">Writing</h1>

<ul class="writing-list">
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
