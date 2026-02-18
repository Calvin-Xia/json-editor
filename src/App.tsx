import React from 'react';
import Toolbar from './components/Toolbar';
import TreeView from './components/TreeView';
import FormEditor from './components/FormEditor';
import StatusBar from './components/StatusBar';
import './styles/index.css';

const App: React.FC = () => {
  return (
    <div className="app-container">
      <Toolbar />
      <div className="main-content">
        <div className="left-panel">
          <TreeView />
        </div>
        <div className="right-panel">
          <FormEditor />
        </div>
      </div>
      <StatusBar />
    </div>
  );
};

export default App;
