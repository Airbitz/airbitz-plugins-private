var app=angular.module("todoicus",["ngAnimate"]);app.controller("todoCtrl",function(t,o){t.DF=o,t.DF.addData({text:"Check this and it will cross it out.",complete:!1}),t.addTodo=function(){var o={text:t.newTodo,complete:!1};t.DF.addData(o),t.newTodo=""},t.clearAll=function(){t.DF.clearData()}}),app.controller("doneCtrl",function(t,o){t.DF=o,t.DF.addData({text:"complete item from last week",complete:!0})}),app.controller("dataCtrl",function(t,o){t.storage_array=o.getStorageArray(),console.log("dataCtrl loaded:")});