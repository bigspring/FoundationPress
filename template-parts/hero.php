<?php
/**
 * Template part for hero unit, used mostly on the homepage
 *
 * @package FoundationPress
 * @since FoundationPress 1.0.0
 */

?>

<header class="hero-unit" role="banner">
	<div class="caption">
		<div class="tagline">
			<h1><?php the_title(); ?></h1>
			<h4 class="subheader"><?php get_the_excerpt(); ?></h4>
			<a role="button" class="success large button" href="http://www.bigspring.co.uk">Do something great</a>
		</div>
</header>
