import { useState } from 'react';

export default function AnalyzePage() {
    const [file, setFile] = useState(null);
    const [feedback, setFeedback] = useState('');

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
    };

    const handleAnalyzeClick = async () => {
        if (file) {
            const formData = new FormData();
            formData.append('file', file);

            const res = await fetch('/api/analyze', {
                method: 'POST',
                body: formData,
            });

            const data = await res.json();
            setFeedback(data.feedback);
        }
    };

    return (
        <div>
            <h1>Upload Lesson Plan or Curriculum for Analysis</h1>
            
            <form>
                <label htmlFor="fileUpload">Upload File:</label>
                <input 
                    type="file" 
                    id="fileUpload" 
                    name="file" 
                    accept=".txt,.pdf,.docx,.jpg,.png"
                    onChange={handleFileChange} 
                />
                <button type="button" onClick={handleAnalyzeClick}>
                    Analyze
                </button>
            </form>

            {feedback && (
                <div>
                    <h2>Analysis Feedback</h2>
                    <p>{feedback}</p>
                </div>
            )}
        </div>
    );
}
