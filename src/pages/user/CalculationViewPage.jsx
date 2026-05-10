import { useParams, Link } from 'react-router-dom';
import Layout from '../../components/shared/Layout.jsx';
import CalcEngine from '../../components/calcEngine/CalcEngine.jsx';

export default function CalculationViewPage() {
    const { id } = useParams();

    return (
        <Layout>
            {/* Back link */}
            <div style={{ marginBottom: 20 }}>
                <Link
                    to="/calculations"
                    style={{
                        color: 'var(--g600)', fontSize: 13, fontWeight: 700,
                        textDecoration: 'none', display: 'inline-flex',
                        alignItems: 'center', gap: 4,
                    }}
                >
                    ← Back to Calculations
                </Link>
            </div>

            {/* Calculation engine */}
            <CalcEngine calcId={id} />
        </Layout>
    );
}
