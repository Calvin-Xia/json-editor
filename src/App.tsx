import React from 'react';
import Toolbar from './components/Toolbar';
import TreeView from './components/TreeView';
import FormEditor from './components/FormEditor';
import StatusBar from './components/StatusBar';
import RawPreview from './components/RawPreview';
import ModifyDemo from './components/ModifyDemo';
import ParseError from './components/ParseError';
import './styles/index.css';

const App: React.FC = () => {
  return (
    <div className="app-container">
      <Toolbar />
      <div className="main-content">
        <div className="left-panel">
          <TreeView />
        </div>
        <div className="center-panel">
          <FormEditor />
          <ModifyDemo />
        </div>
        <div className="right-panel">
          <ParseError />
          <RawPreview />
        </div>
      </div>
      <StatusBar />
    </div>
  );
};

export default App;
