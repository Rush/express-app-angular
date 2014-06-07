window.name = "NG_DEFER_BOOTSTRAP!";
define(function(require) {
	var $ = require('jquery');
	var angular = require('angular');
	require('ui-bootstrap');
	require('sortable');


	angular.module('ews', []).factory("$ews", function() {
		var ews = require('ews');
		var socket = new ews.RESTSocket("");

		return function(httpConfig) {
			
			function doRequest() {
				console.log("Doing request", httpConfig);
				socket.request(httpConfig.method, httpConfig.url, null, function(data) {
					console.log("Got data", data);
				});
			}

			if(socket.isConnected) {
				doRequest();
			}
			else {
				socket.once('ewsConnected', function() {
					console.log("On ewsConnected");
					doRequest();
				});
			}
		};
	});

	

	var myControls = angular.module('myControls', ['ui.bootstrap', 'ui.sortable']);
	myControls.directive('myToggle', function() {
		return {
			scope: {
				'ngModel': '='
			},
			transclude: true,
			restrict: 'E',
			template: require('jade!myToggle')
		};
	});
	myControls.directive('mySelect', function() {
		return {
			scope: {
				'ngModel': '=',
			},
			transclude: true,
			restrict: 'E',
			template: require('jade!mySelect'),
			link: function(scope, element, attrs) {
				var dropdown = element.find('ul.dropdown-menu');

				scope.selectableOptions = [];
				element.find('option').each(function() {
					var option = $(this);
					scope.selectableOptions.push({
						value: option.val(),
						text: option.text()
					});
				});
				scope.currentOption = scope.selectableOptions[0];
				scope.onClick = function(option) {
					scope.currentOption = option;
					scope.ngModel = option.value;
				};
			}
		}
	});


	var app = angular.module('app', ['myControls']);
	app.controller('HelloCntl', function($scope) {
		$scope.name = "World";
	});

	app.run(function($rootScope) {
		$rootScope.title = "Title from Angular";
		console.log($rootScope);
	});

	app.controller("HelloCntlList", function($scope) {

	});

	app.controller("LiveDate", function($scope) {
		$scope.text = "TEST";
		this.text = "TEST";
		console.log("LiveDate");
	});


	app.factory('myHttpInterceptor', function ($q) {
		return {
			response: function(response) {
				console.log(response);
				return "TEST";
			}
		};
	});

	app.config(function ($httpProvider) {
    $httpProvider.interceptors.push('myHttpInterceptor');
	});

	app.directive('todoBlur', function() {
		return function(scope, elem, attrs) {
			elem.bind('blur', function() {
				scope.$apply(attrs.todoBlur);
			});
		};
	});

	app.directive('todoFocus', ['$timeout',
		function($timeout) {
			return function(scope, elem, attrs) {
				scope.$watch(attrs.todoFocus, function(newval) {
					if (newval) {
						$timeout(function() {
							elem[0].focus();
						}, 0, false);
					}
				});
			};
		}
	]);

	app.factory('todoStorage', function() {
		var STORAGE_ID = 'todos-angularjs-requirejs';
		return {
			get: function() {
				return JSON.parse(localStorage.getItem(STORAGE_ID) || '[]');
			},
			put: function(todos) {
				localStorage.setItem(STORAGE_ID, JSON.stringify(todos));
			}
		};
	});

	app.factory('TodoItems', function($rootScope) {
		// var TodoItems = $wsResource(
		// 	'/todoitems/:id', // URL template
		// 	{
		// 		id: '@id'
		// 	}, // default values
		// 	{
		// 		create: {
		// 			method: 'POST'
		// 		},
		// 		update: {
		// 			method: 'PUT'
		// 		},
		// 		reorder: {
		// 			method: 'POST',
		// 			isArray: true,
		// 			transformRequest: function(data, headersGetter) {
		// 				return JSON.stringify(data.map(function(elem) {
		// 					return elem.id;
		// 				}));
		// 			}
		// 		}
		//   }
		// );
		var todos = [];
    var id = 0;
		return {
      query: function() {
        return todos;
      },
      create: function(newItem) {
        console.log(newItem);
        newItem.id = id++;
        todos.push(newItem);
      }
    };
	});


  app.controller('TodoItemController', function($scope, TodoItems) {
    console.log("TodoItemController");
    console.log($scope);
    
    $scope.onChange = function() {
      console.log("On change");
    };

    $scope.$watch("id", function(oldId, newId) {
      console.log("Old id", oldId, "New id", newId);
    });

    $scope.$on("$destroy", function() {
      console.log("Destroy", $scope.id);
    });

    $scope.$watchCollection("todo", function(oldItem, newItem) {
      // console.log(oldItem);
      // console.log(newItem);
      console.log("old title", JSON.stringify(oldItem));
      console.log("new title", JSON.stringify(newItem));
    });
  });

	app.controller('TodoController', function TodoController($scope, $location, TodoItems, filterFilter) {
			var todos = $scope.todos = TodoItems.query();

			$scope.sortableOptions = {
    		stop: function(e, ui) {
    			$scope.$apply(function() {
						TodoItems.reorder($scope.todos);
    			});
    		}
    	};


			$scope.newTodo = '';
			$scope.editedTodo = null;

/*			$scope.$watch('todos', function() {
				$scope.remainingCount = filterFilter(todos, {
					completed: false
				}).length;
				$scope.doneCount = todos.length - $scope.remainingCount;
				$scope.allChecked = !$scope.remainingCount;
				console.log("Got todos");
				//todoStorage.put(todos);
			}, true);*/

			if ($location.path() === '') {
				$location.path('/');
			}

			$scope.location = $location;

			$scope.$watch('location.path()', function(path) {
				$scope.statusFilter = (path === '/active') ? {
					completed: false
				} : (path === '/completed') ? {
					completed: true
				} : null;
			});

			$scope.addTodo = function() {
				var newTodo = $scope.newTodo.trim();
				if (!newTodo.length) {
					return;
				}

				var todo = {
					title: newTodo,
					completed: false
				};

				todos.push(todo);

				$scope.newTodo = '';
			};

			$scope.editTodo = function(todo) {
				$scope.editedTodo = todo;
			};

			$scope.doneEditing = function(todo) {
				$scope.editedTodo = null;
				todo.title = todo.title.trim();

				if (!todo.title) {
					$scope.removeTodo(todo);
				}
			};

			$scope.removeTodo = function(todo) {
				todos.splice(todos.indexOf(todo), 1);
			};

			$scope.clearDoneTodos = function() {
				$scope.todos = todos = todos.filter(function(val) {
					return !val.completed;
				});
			};

			$scope.markAll = function(done) {
				todos.forEach(function(todo) {
					todo.completed = done;
				});
			};
		}
	);

	angular.element().ready(function() {
		angular.bootstrap(document, ['app']);
	});
});