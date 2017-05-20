const GROUPS_SCROLL_DELAY = 5;
$(function() {

/*
 *  Groups bar caret scrolling
 */

  $(document).on('mousedown', '.overflow-up', function() {
    var bar = $('.groups-bar')[0];
    var heightToScroll = bar.scrollTop;
    var delay = heightToScroll * GROUPS_SCROLL_DELAY;

    $('.groups-bar').animate({scrollTop: 0}, delay);
  });

  $(document).on('mouseup', '.overflow-up', function() {
    $('.groups-bar').stop(true);
  });

  $(document).on('mousedown', '.overflow-down', function() {
    var bar = $('.groups-bar')[0];
    var totalHeight = bar.scrollHeight - bar.clientHeight;
    var heightToScroll = totalHeight - bar.scrollTop;
    var delay = heightToScroll * GROUPS_SCROLL_DELAY;

    $('.groups-bar').animate({scrollTop: bar.scrollHeight}, delay);
  });

  $(document).on('mouseup', '.overflow-down', function() {
    $('.groups-bar').stop(true);
  });

  $(document).on('mouseenter', '.group-block', function(event) {
    var block = $(event.target);
    var key = block.data('key');
    var value = block.data('value');
    var num = block.data('num');

    var top = block.offset().top - $($('.groups-bar-container')[0]).offset().top;
    top += (block.height() / 2 - 20);

    var id = $('body').data('id');

    // if grouping by experiment, additionally fetch the description
    if (key == "Experiment ID" || key == "Experiment Run ID") {
      $.ajax({
        url: '/projects/' + id + '/experiments',
        type: "GET",
        success: function(response) {
          var description = null;
          if (key == "Experiment ID") {
            for (var i=0; i<response.experiments.length; i++) {
              if (response.experiments[i].id == value) {
                description = response.experiments[i].description;
              }
            }
          } else if (key == "Experiment Run ID") {
            for (var i=0; i<response.experimentRuns.length; i++) {
              if (response.experimentRuns[i].id == value) {
                description = response.experimentRuns[i].description;
              }
            }
          }

          var obj = {
            'key': key,
            'value': value,
            'num': num,
            'description': description
          };

          var tooltip = $(new EJS({url: '/ejs/group-tooltip.ejs'}).render(obj));
          tooltip.css({'top': top + 'px'});
          $('.groups-bar-container').append(tooltip);
        }
      });
    } else {
      // otherwise, just show tooltip normally
      var obj = {
        'key': key,
        'value': value,
        'num': num,
        'description': null
      };

      var tooltip = $(new EJS({url: '/ejs/group-tooltip.ejs'}).render(obj));
      tooltip.css({'top': top + 'px'});
      $('.groups-bar-container').append(tooltip);
    }
  });

  $(document).on('mouseleave', '.group-block', function() {
    $('.group-tooltip').remove();
  });

  // Model see more listener
  $(document).on('click', '.model-see-more', function(event) {
    var elt = $(event.target);
    var info = elt.parent().find('.model-additional-info');
    var show = elt.data('show');
    if (show) {
      elt.data('show', false);
      elt.html("See More");
      info.slideUp();
      info.animate(
        { opacity: 0 },
        { queue: false, duration: 'slow' }
      );
    } else {
      elt.data('show', true);
      elt.html("See Less");
      info.slideDown();
      info.animate(
        { opacity: 1 },
        { queue: false, duration: 'slow' }
      );
    }
  });

  // filter toggle options
  $(document).on('click', '.filter-expand', function(event) {
    var elt = $(event.target);
    var filter = elt.closest('.filter');
    var options = elt.next('.filter-options');
    if (elt.data('show')) {
      // hide options
      options.slideUp();
      elt.html("&#9660;");
      elt.data('show', false);
    } else {
      // show options
      options.slideDown();
      options.find('input[type="text"]').val(filter.data('val').join(', '));
      options.find('input[type="text"]').focus();
      elt.html("&#9650;");
      elt.data('show', true);
    }
  });

  // show json modal
  $(document).on('click', '.json-md-trigger', function(event) {
    // TODO: duplicate call; avoid
    var modelId = $(event.target).data('id');
    $.ajax({
      url: '/models/' + modelId + '/metadata',
      type: "GET",
      success: function(response) {
        var node = new PrettyJSON.view.Node({
          el:$('#md-json'),
          data:JSON.parse(response)
        });
        node.expandAll();
        $('#modal-2').addClass('md-show');
        attachModalListeners();
        node.collapseAll();
      }
    });
  });

  $(document).on('click', '.md-close, .md-overlay', function(event) {
    $('.md-modal').removeClass('md-show');
  });

  // close modal with escape key
  $(document).keyup(function(event) {
    if (event.which == 27) {
      $('.md-modal').removeClass('md-show');
    }
  });

  // link to model predictions
  $(document).on('click', '.view-predictions', function(event) {
    var projectId = $('body').data('id');
    var modelId = $(this).data('modelid');
    var metadataId = $(this).data('metadataid');

    var ids = [];

    // hacky way of getting previous model
    for (var i=0; i<models.length; i++) {
      if (models[i].id == modelId - 1) {
        ids.push(JSON.parse(models[i].metadata)["model_id"]);
      }
    }

    ids.push(metadataId);

    var query = $.param({'ids': ids});
    //window.location.href = "/projects/" + projectId + "/predictions/?" + query;
    window.location.href = "/projects/" + projectId + "/predictions";
  });

  function attachModalListeners() {
    var json = $('#md-json');
    var leaves = $('#md-json .leaf-container');
    for (var i=0; i<leaves.length; i++) {
      leaves[i] = leaves[i].closest('li');
      var leaf = $(leaves[i]);
      leaf.data('json', true);

      // figure out key value
      var key = leaf.children().html().split("&nbsp;")[0];
      var value = leaf.find('.leaf-container span').html().trim();
      var valueWithoutQuotes = value.replace(/"/g,"");
      value = (valueWithoutQuotes == value) ? parseFloat(value) : valueWithoutQuotes;

      var parent = leaf.parent().closest('li');

      while (parent.length != 0) {
        var split = parent.children().html().split("&nbsp;");

        // can't flatten arrays well
        if (split[0].match("node-top node-bracket")) {
          leaf.addClass('nkv');
          parent.length = 0;
        } else {
          key = split[0] + "." + key;
          parent = parent.parent().closest('li');
        }
      }
      leaf.data('key', "md." + key);
      leaf.data('val', value);
    }

    leaves.addClass('kv');
    leaves.addClass('json-kv');
  }
});