<form action="<?php echo site_url(); ?>" id="search-form" method="get">
	<div class="row collapse">
		<div class="small-10 columns">
			<input value="<?php the_search_query(); ?>" type="search" class="search" name="s"
			       placeholder="<?php _e( 'Search the site...', 'monolith' ); ?>">
		</div>
		<div class="small-2 columns">
			<button class="button postfix"><?php _e( 'Go', 'monolith' ); ?></button>
		</div>
	</div>
</form>