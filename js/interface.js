function populateNavBarIndicators(){
  $.ajax({
    type: 'GET',
    url: `data/indicator_menu_fields.csv`,
    dataType: 'text',
    success: function(data) {
      processCSV(data).forEach(function(line) {
        var bn = line['basename'];
        var cn = line['cleanname'];
        cleanFiles[bn] = cn
        var li = '<li id=' + bn + '><a onclick=' +
                 '"populateMapWithChoropleth(\'' +
                 bn + '\')">' + cn + '</a></li>';
        
        // Add to the menu list
        $('.indicator-menu').append(li)

        // Also need to add to the list of items to download
        var fdlLi = '<li><a href="/data/indicator_files/' + bn +
                    '.csv">' + cn + '</a></li>';
        $('.fullDownloadModalList').append(fdlLi);
      });
    }
   });
}

function toggleMenu() {
  var toggleMenu = $('.menu-toggle');
  var isToggled = toggleMenu.parent().hasClass('toggled')
  if (isToggled) {
    var animDir = { 'left' : 0 };
    toggleMenu.parent().animate(animDir, 350, function() {
      $('#main-container').removeClass('toggled'); 
    });
  } else {
    var navWidth = $('#nav-panel').width();
    var animDir = { 'left' : navWidth };
    toggleMenu.parent().animate(animDir, 350, function() {
      $('#main-container').addClass('toggled');
    });
  }
}

// Initializing these functions
$('.menu-toggle').on('click', toggleMenu);
populateNavBarIndicators();